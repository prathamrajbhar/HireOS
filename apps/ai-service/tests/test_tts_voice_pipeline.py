"""Voice interview TTS pipeline tests.

Unit/route tests run offline against a faked edge_tts. The final class hits the real Edge TTS
endpoint and is opt-in: RUN_LIVE_TTS=1 pytest tests/test_tts_voice_pipeline.py
"""
import base64
import json
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes import voice_routes
from services.stt_tts import tts_service

FAKE_MP3 = b"\xff\xf3d\xc4" + b"\x00" * 64  # MPEG frame sync header + padding


class FakeCommunicate:
    """Stands in for edge_tts.Communicate; behaviour is driven by FakeCommunicate.plan."""

    plan = []  # list of: "ok" | "empty" | Exception — consumed one per attempt
    calls = []

    def __init__(self, text, voice):
        FakeCommunicate.calls.append((text, voice))
        self._outcome = FakeCommunicate.plan.pop(0) if FakeCommunicate.plan else "ok"

    async def stream(self):
        if isinstance(self._outcome, Exception):
            raise self._outcome
        yield {"type": "WordBoundary", "data": {}}
        if self._outcome == "ok":
            yield {"type": "audio", "data": FAKE_MP3}


@pytest.fixture(autouse=True)
def fake_edge(monkeypatch):
    FakeCommunicate.plan, FakeCommunicate.calls = [], []
    monkeypatch.setattr(tts_service.edge_tts, "Communicate", FakeCommunicate)
    monkeypatch.setattr(tts_service, "TTS_RETRY_DELAY_SECONDS", 0)
    tts_service.reset_tts_circuit()
    yield
    tts_service.reset_tts_circuit()


def decode(data_uri: str) -> bytes:
    assert data_uri.startswith("data:audio/mp3;base64,")
    return base64.b64decode(data_uri.split(",", 1)[1])


# ---------------------------------------------------------------- service

class TestSynthesis:
    async def test_returns_audio_bytes(self):
        assert await tts_service.generate_tts_audio_bytes("Hello there.") == FAKE_MP3

    async def test_blank_text_makes_no_remote_call(self):
        assert await tts_service.generate_tts_audio_bytes("   ") == b""
        assert FakeCommunicate.calls == []

    async def test_uses_requested_voice_and_trimmed_text(self):
        await tts_service.generate_tts_audio_bytes("  Hi  ", voice="en-GB-RyanNeural")
        assert FakeCommunicate.calls == [("Hi", "en-GB-RyanNeural")]

    async def test_data_uri_is_browser_playable(self):
        assert decode(await tts_service.generate_tts_audio_base64("Hello.")) == FAKE_MP3

    async def test_returns_empty_string_not_exception_when_unavailable(self):
        FakeCommunicate.plan = [RuntimeError("403")] * 2
        assert await tts_service.generate_tts_audio_base64("Hello.") == ""


class TestResilience:
    async def test_one_transient_failure_is_retried_and_does_not_count(self):
        FakeCommunicate.plan = [RuntimeError("blip"), "ok"]
        assert await tts_service.generate_tts_audio_bytes("Hello.") == FAKE_MP3
        assert len(FakeCommunicate.calls) == 2
        assert tts_service.is_tts_service_available()

    async def test_empty_audio_is_treated_as_failure_then_retried(self):
        FakeCommunicate.plan = ["empty", "ok"]
        assert await tts_service.generate_tts_audio_bytes("Hello.") == FAKE_MP3

    async def test_breaker_stays_closed_below_threshold(self):
        for _ in range(tts_service.TTS_FAILURE_THRESHOLD - 1):
            FakeCommunicate.plan = [RuntimeError("403")] * tts_service.TTS_ATTEMPTS
            assert await tts_service.generate_tts_audio_bytes("Hello.") == b""
        assert tts_service.is_tts_service_available()

    async def test_breaker_opens_after_threshold_then_skips_remote_calls(self):
        for _ in range(tts_service.TTS_FAILURE_THRESHOLD):
            FakeCommunicate.plan = [RuntimeError("403")] * tts_service.TTS_ATTEMPTS
            await tts_service.generate_tts_audio_bytes("Hello.")
        assert not tts_service.is_tts_service_available()

        FakeCommunicate.calls.clear()
        assert await tts_service.generate_tts_audio_bytes("Hello.") == b""
        assert FakeCommunicate.calls == []

    async def test_breaker_recovers_after_cooldown(self, monkeypatch):
        for _ in range(tts_service.TTS_FAILURE_THRESHOLD):
            FakeCommunicate.plan = [RuntimeError("403")] * tts_service.TTS_ATTEMPTS
            await tts_service.generate_tts_audio_bytes("Hello.")
        monkeypatch.setattr(tts_service, "_tts_cooldown_until", 0.0)
        assert await tts_service.generate_tts_audio_bytes("Hello.") == FAKE_MP3

    async def test_success_resets_failure_count(self):
        FakeCommunicate.plan = [RuntimeError("x")] * tts_service.TTS_ATTEMPTS
        await tts_service.generate_tts_audio_bytes("Hello.")
        await tts_service.generate_tts_audio_bytes("Hello.")
        assert tts_service._tts_consecutive_failures == 0


class TestSentenceStreaming:
    async def test_streams_one_chunk_per_sentence_with_final_flag(self):
        chunks = [c async for c in tts_service.stream_sentence_tts("First point. Second point! Third?")]
        assert [c["sentence"] for c in chunks] == ["First point.", "Second point!", "Third?"]
        assert [c["is_final"] for c in chunks] == [False, False, True]
        assert all(decode(c["audio"]) == FAKE_MP3 for c in chunks)

    async def test_blank_text_yields_single_final_chunk(self):
        chunks = [c async for c in tts_service.stream_sentence_tts("")]
        assert chunks == [{"sentence": "", "audio": "", "is_final": True}]

    async def test_text_continues_without_audio_when_tts_is_down(self):
        FakeCommunicate.plan = [RuntimeError("403")] * 2
        chunks = [c async for c in tts_service.stream_sentence_tts("Only one.")]
        assert chunks[0]["sentence"] == "Only one." and chunks[0]["audio"] == ""


# ---------------------------------------------------------------- routes (interview turn -> audio)

AI_TEXT = "Welcome to the interview. Tell me about yourself."


@pytest.fixture
def client(monkeypatch):
    def fake_agent(state):
        assert state["latest_candidate_response"] is not None
        return {"latest_ai_response": AI_TEXT, "current_stage": "intro", "is_complete": False}

    monkeypatch.setattr(voice_routes, "run_interviewer_agent", fake_agent)
    app = FastAPI()
    app.include_router(voice_routes.voice_router)
    return TestClient(app)


TURN = {"interviewId": "int-1", "transcript": "", "turnNumber": 0, "stage": "intro", "jobTitle": "Engineer"}
BASE = "/api/v1/ai/interview"


class TestInterviewTurnPipeline:
    def test_respond_returns_text_and_playable_audio(self, client):
        body = client.post(f"{BASE}/respond", json=TURN).json()
        assert body["text"] == AI_TEXT
        assert decode(body["audioUrl"]) == FAKE_MP3
        assert FakeCommunicate.calls[0][0] == AI_TEXT

    def test_respond_forwards_the_requested_voice(self, client):
        client.post(f"{BASE}/respond", json={**TURN, "voice": "en-US-JennyNeural"})
        assert FakeCommunicate.calls[0][1] == "en-US-JennyNeural"

    def test_respond_still_returns_text_when_tts_is_down(self, client):
        FakeCommunicate.plan = [RuntimeError("403")] * 2
        res = client.post(f"{BASE}/respond", json=TURN)
        assert res.status_code == 200
        assert res.json()["text"] == AI_TEXT and res.json()["audioUrl"] == ""

    def test_respond_503_when_llm_returns_nothing(self, client, monkeypatch):
        monkeypatch.setattr(voice_routes, "run_interviewer_agent", lambda s: {})
        assert client.post(f"{BASE}/respond", json=TURN).status_code == 503

    def test_tts_endpoint(self, client):
        res = client.post(f"{BASE}/tts", json={"text": "Hello."})
        assert res.status_code == 200 and res.json()["audio_format"] == "mp3"
        assert decode(res.json()["audio_url"]) == FAKE_MP3

    def test_tts_endpoint_rejects_blank_text(self, client):
        assert client.post(f"{BASE}/tts", json={"text": "  "}).status_code == 400

    def test_voice_stream_emits_sentence_audio_as_server_sent_events(self, client):
        res = client.post(f"{BASE}/voice-stream", json=TURN)
        assert res.headers["content-type"].startswith("text/event-stream")
        events = [json.loads(l[6:]) for l in res.text.splitlines() if l.startswith("data: ")]
        assert [e["sentence"] for e in events] == ["Welcome to the interview.", "Tell me about yourself."]
        assert events[-1]["is_final"] and all(decode(e["audio"]) == FAKE_MP3 for e in events)


# ---------------------------------------------------------------- live (opt-in)

@pytest.mark.skipif(os.getenv("RUN_LIVE_TTS") != "1", reason="set RUN_LIVE_TTS=1 to hit the real Edge TTS service")
class TestLiveEdgeTts:
    @pytest.fixture(autouse=True)
    def real_edge(self, monkeypatch):
        import edge_tts
        monkeypatch.undo()  # drop the FakeCommunicate patch for this class
        tts_service.reset_tts_circuit()
        assert tts_service.edge_tts is edge_tts

    async def test_real_synthesis_returns_mp3(self):
        audio = await tts_service.generate_tts_audio_bytes("Tell me about a project you are proud of.")
        assert len(audio) > 5_000, "Edge TTS returned no audio (403/handshake rejected? upgrade edge-tts)"
        assert audio[:3] == b"ID3" or (audio[0] == 0xFF and audio[1] & 0xE0 == 0xE0)
        assert tts_service.is_tts_service_available()
