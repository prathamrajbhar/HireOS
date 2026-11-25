"""Voice round-trip smoke tests (interviewer speaks -> candidate audio is transcribed).

Offline tests cover the /transcribe contract. The live class synthesises speech with the real
Edge TTS service, then transcribes that audio with the real Groq Whisper client and checks the words
survive the trip:  RUN_LIVE_VOICE=1 pytest tests/test_voice_roundtrip_smoke.py
"""
import base64
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes import voice_routes
from services.stt_tts import stt_service, tts_service
from services.stt_tts.stt_service import SttUnavailableError

BASE = "/api/v1/ai/interview"
AUDIO = b"\x1aE\xdf\xa3fake-webm-bytes"


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(voice_routes.voice_router)
    return TestClient(app)


@pytest.fixture
def stt_calls(monkeypatch):
    calls = []

    def fake_transcribe(audio_bytes, filename="audio.webm", language="en"):
        calls.append((audio_bytes, filename, language))
        return "I led the migration to Postgres", 0.92

    monkeypatch.setattr(voice_routes, "transcribe_audio_bytes", fake_transcribe)
    return calls


class TestTranscribeContract:
    def test_accepts_base64_json(self, client, stt_calls):
        res = client.post(f"{BASE}/transcribe", json={"audio_base64": base64.b64encode(AUDIO).decode()})
        assert res.status_code == 200
        assert res.json() == {"transcript": "I led the migration to Postgres", "confidence": 0.92, "no_speech": False}
        assert stt_calls[0][0] == AUDIO

    def test_accepts_multipart_upload_and_keeps_filename_and_language(self, client, stt_calls):
        res = client.post(f"{BASE}/transcribe?language=hi", files={"file": ("answer.webm", AUDIO, "audio/webm")})
        assert res.status_code == 200
        assert stt_calls[0] == (AUDIO, "answer.webm", "hi")

    def test_silence_is_a_successful_no_speech_response(self, client, monkeypatch):
        monkeypatch.setattr(voice_routes, "transcribe_audio_bytes", lambda *a: ("", None))
        res = client.post(f"{BASE}/transcribe", files={"file": ("a.webm", AUDIO, "audio/webm")})
        assert res.status_code == 200 and res.json()["no_speech"] is True

    def test_provider_failure_is_a_503_not_a_silent_empty_success(self, client, monkeypatch):
        def boom(*a):
            raise SttUnavailableError("Speech-to-text provider error: 429")

        monkeypatch.setattr(voice_routes, "transcribe_audio_bytes", boom)
        res = client.post(f"{BASE}/transcribe", files={"file": ("a.webm", AUDIO, "audio/webm")})
        assert res.status_code == 503 and "429" in res.json()["detail"]

    def test_rejects_missing_empty_corrupt_and_oversized_audio(self, client, stt_calls, monkeypatch):
        assert client.post(f"{BASE}/transcribe", json={}).status_code == 400
        assert client.post(f"{BASE}/transcribe", json={"audio_base64": ""}).status_code == 400
        assert client.post(f"{BASE}/transcribe", json={"audio_base64": "!!not-base64!!"}).status_code == 400
        monkeypatch.setattr(voice_routes, "MAX_TRANSCRIBE_BYTES", 10)
        assert client.post(f"{BASE}/transcribe", files={"file": ("a.webm", AUDIO, "audio/webm")}).status_code == 413
        assert stt_calls == []


def verbose(segments, text=""):
    return type("R", (), {"segments": segments, "text": text})()


def seg(text, no_speech=0.01, logprob=-0.2):
    return {"text": text, "no_speech_prob": no_speech, "avg_logprob": logprob}


def groq_returning(response):
    class Client:
        class audio:
            class transcriptions:
                @staticmethod
                def create(**kwargs):
                    assert kwargs["response_format"] == "verbose_json"
                    assert kwargs["language"] == "en" and kwargs["model"].startswith("whisper")
                    return response

    return Client


class TestSttService:
    def test_empty_audio_returns_empty_without_calling_the_provider(self, monkeypatch):
        monkeypatch.setattr(stt_service, "groq_client", None)
        assert stt_service.transcribe_audio_bytes(b"") == ("", None)

    def test_missing_provider_raises_instead_of_pretending_nothing_was_said(self, monkeypatch):
        monkeypatch.setattr(stt_service, "groq_client", None)
        with pytest.raises(SttUnavailableError, match="GROQ_API_KEY"):
            stt_service.transcribe_audio_bytes(AUDIO)

    def test_provider_failure_raises(self, monkeypatch):
        class Failing:
            class audio:
                class transcriptions:
                    @staticmethod
                    def create(**_):
                        raise RuntimeError("429 rate limited")

        monkeypatch.setattr(stt_service, "groq_client", Failing)
        with pytest.raises(SttUnavailableError, match="429"):
            stt_service.transcribe_audio_bytes(AUDIO)

    def test_joins_good_segments_and_reports_confidence(self, monkeypatch):
        resp = verbose([seg("I led the migration", logprob=-0.1), seg("to a new database.", logprob=-0.3)])
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(resp))
        text, confidence = stt_service.transcribe_audio_bytes(AUDIO)
        assert text == "I led the migration to a new database."
        assert 0.7 < confidence < 1.0

    def test_drops_silence_segments_whisper_invented(self, monkeypatch):
        resp = verbose([seg("Real answer here."), seg("Thanks.", no_speech=0.9, logprob=-1.8)])
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(resp))
        assert stt_service.transcribe_audio_bytes(AUDIO)[0] == "Real answer here."

    def test_keeps_a_quiet_but_confident_segment(self, monkeypatch):
        resp = verbose([seg("Yes, absolutely.", no_speech=0.8, logprob=-0.3)])
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(resp))
        assert stt_service.transcribe_audio_bytes(AUDIO)[0] == "Yes, absolutely."

    @pytest.mark.parametrize("phantom", ["Thanks for watching!", "Thank you for watching.", "you", "Please subscribe"])
    def test_pure_silence_hallucinations_become_no_speech(self, monkeypatch, phantom):
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(verbose([seg(phantom)])))
        assert stt_service.transcribe_audio_bytes(AUDIO) == ("", None)

    @pytest.mark.parametrize("junk", [".", " . ", "...", "?!"])
    def test_punctuation_only_output_is_no_speech(self, monkeypatch, junk):
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(verbose([seg(junk)])))
        assert stt_service.transcribe_audio_bytes(AUDIO) == ("", None)

    def test_legitimate_short_answers_are_not_filtered(self, monkeypatch):
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(verbose([seg("Thank you.")])))
        assert stt_service.transcribe_audio_bytes(AUDIO)[0] == "Thank you."

    def test_falls_back_to_plain_text_when_no_segments(self, monkeypatch):
        monkeypatch.setattr(stt_service, "groq_client", groq_returning(verbose([], text="  hello there  ")))
        assert stt_service.transcribe_audio_bytes(AUDIO) == ("hello there", None)


@pytest.mark.skipif(os.getenv("RUN_LIVE_VOICE") != "1", reason="set RUN_LIVE_VOICE=1 to hit real Edge TTS + Groq")
class TestLiveVoiceRoundTrip:
    @pytest.fixture(autouse=True)
    def require_groq(self):
        if stt_service.groq_client is None:
            pytest.skip("GROQ_API_KEY not configured")
        tts_service.reset_tts_circuit()

    async def test_spoken_sentence_survives_tts_then_stt(self):
        sentence = "I led the migration of our payment system to a new database last year."
        audio = await tts_service.generate_tts_audio_bytes(sentence)
        assert len(audio) > 5_000, "TTS produced no audio"

        transcript, _ = stt_service.transcribe_audio_bytes(audio, filename="speech.mp3")
        heard = transcript.lower()
        assert transcript, "STT returned an empty transcript for clearly spoken audio"
        for word in ("migration", "payment", "database"):
            assert word in heard, f"'{word}' missing from transcript: {transcript!r}"

    # Pure silence is NOT asserted here: Whisper answers "Thank you." for it, so the browser VAD
    # (see voiceActivity.test.ts) is what keeps silence from ever being uploaded.
    @pytest.mark.parametrize("kind", ["noise"])
    def test_background_noise_does_not_become_text(self, kind):
        import io
        import random
        import struct
        import wave

        rate, seconds = 16000, 3
        rng = random.Random(7)
        amp = 0 if kind == "silence" else 400
        frames = b"".join(struct.pack("<h", rng.randint(-amp, amp) if amp else 0) for _ in range(rate * seconds))
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(frames)

        transcript, _ = stt_service.transcribe_audio_bytes(buf.getvalue(), filename="quiet.wav")
        assert transcript == "", f"{kind} was transcribed as {transcript!r}"

