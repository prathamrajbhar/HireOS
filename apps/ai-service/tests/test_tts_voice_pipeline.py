"""Voice interview TTS pipeline tests.

Unit/route tests run offline against a faked edge_tts. The final class hits the real Edge TTS
endpoint and is opt-in: RUN_LIVE_TTS=1 pytest tests/test_tts_voice_pipeline.py
"""
import asyncio
import base64
import json
import os
import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routes import voice_routes
from services.stt_tts import tts_service

FAKE_MP3 = b"\xff\xf3d\xc4" + b"\x00" * 64  # MPEG frame sync header + padding


class FakeCommunicate:
    """Stands in for edge_tts.Communicate.

    plan:  list of "ok" | "empty" | Exception consumed one per attempt (single-sentence tests).
    rules: {substring: "fail" | "empty" | delay_seconds} applied to any text containing the substring.
    """

    plan = []
    rules = {}
    calls = []
    active = 0
    peak = 0
    cancelled = []

    def __init__(self, text, voice):
        self.text = text
        FakeCommunicate.calls.append((text, voice))
        self._outcome = FakeCommunicate.plan.pop(0) if FakeCommunicate.plan else "ok"

    @classmethod
    def reset(cls):
        cls.plan, cls.rules, cls.calls, cls.cancelled = [], {}, [], []
        cls.active = cls.peak = 0

    async def stream(self):
        FakeCommunicate.active += 1
        FakeCommunicate.peak = max(FakeCommunicate.peak, FakeCommunicate.active)
        try:
            rule = next((v for k, v in FakeCommunicate.rules.items() if k in self.text), None)
            if isinstance(rule, (int, float)):
                await asyncio.sleep(rule)
            if isinstance(self._outcome, Exception):
                raise self._outcome
            if rule == "fail":
                raise RuntimeError("403")
            yield {"type": "WordBoundary", "data": {}}
            if self._outcome == "ok" and rule != "empty":
                yield {"type": "audio", "data": FAKE_MP3}
        except asyncio.CancelledError:
            FakeCommunicate.cancelled.append(self.text)
            raise
        finally:
            FakeCommunicate.active -= 1


@pytest.fixture(autouse=True)
def fake_edge(monkeypatch):
    FakeCommunicate.reset()
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
        chunks = [c async for c in tts_service.stream_sentence_tts("First point is here. Second point is here! Third point is here?")]
        assert [c["sentence"] for c in chunks] == ["First point is here.", "Second point is here!", "Third point is here?"]
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
        sentences = tts_service.split_sentences(AI_TEXT)
        assert decode(body["audioUrl"]) == FAKE_MP3 * len(sentences)  # one clip per sentence, in order
        assert sorted(c[0] for c in FakeCommunicate.calls) == sorted(sentences)

    def test_respond_forwards_the_requested_voice(self, client):
        client.post(f"{BASE}/respond", json={**TURN, "voice": "en-US-JennyNeural"})
        assert FakeCommunicate.calls[0][1] == "en-US-JennyNeural"

    def test_respond_still_returns_text_when_tts_is_down(self, client):
        FakeCommunicate.rules = {"": "fail"}
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


# ---------------------------------------------------------------- parallel, ordered, cancellable

REPLY = "First sentence of the reply. Second sentence of the reply. Third sentence of the reply. Fourth sentence of the reply."


class TestParallelOrderedSynthesis:
    async def test_results_arrive_in_order_even_when_later_sentences_finish_first(self):
        FakeCommunicate.rules = {"First": 0.15, "Second": 0.0}
        parts = [p async for p in tts_service.synthesize_ordered(REPLY)]
        assert [p.index for p in parts] == [0, 1, 2, 3]
        assert [p.is_final for p in parts] == [False, False, False, True]

    async def test_sentences_are_synthesized_in_parallel_not_one_after_another(self):
        FakeCommunicate.rules = {"sentence": 0.2}
        start = time.perf_counter()
        parts = [p async for p in tts_service.synthesize_ordered(REPLY)]
        assert len(parts) == 4
        assert time.perf_counter() - start < 0.5  # sequential would be >= 0.8s

    async def test_first_sentence_is_delivered_without_waiting_for_the_slowest(self):
        FakeCommunicate.rules = {"Fourth": 0.6}
        start = time.perf_counter()
        gen = tts_service.synthesize_ordered(REPLY)
        first = await gen.__anext__()
        elapsed = time.perf_counter() - start
        await gen.aclose()
        assert first.index == 0 and elapsed < 0.3

    async def test_concurrency_is_capped(self):
        FakeCommunicate.rules = {"sentence": 0.05}
        long_reply = " ".join(f"This is sentence number {i} of a long reply." for i in range(14))
        parts = [p async for p in tts_service.synthesize_ordered(long_reply)]
        assert len(parts) == 14
        assert FakeCommunicate.peak <= tts_service.TTS_CONCURRENCY

    async def test_closing_the_stream_cancels_pending_synthesis(self):
        FakeCommunicate.rules = {"Second": 5, "Third": 5, "Fourth": 5}
        gen = tts_service.synthesize_ordered(REPLY)
        await gen.__anext__()
        await gen.aclose()  # the candidate ended the interview
        assert len(FakeCommunicate.cancelled) == 3
        assert FakeCommunicate.active == 0

    async def test_a_failed_sentence_yields_empty_audio_but_the_text_is_kept(self):
        FakeCommunicate.rules = {"Second": "fail"}
        parts = [p async for p in tts_service.synthesize_ordered(REPLY)]
        assert [bool(p.audio) for p in parts] == [True, False, True, True]
        assert parts[1].sentence.startswith("Second")

    async def test_whole_reply_audio_is_all_or_nothing(self):
        FakeCommunicate.rules = {"Third": "fail"}
        assert await tts_service.generate_tts_audio_bytes(REPLY) == b""
        FakeCommunicate.reset()
        assert await tts_service.generate_tts_audio_bytes(REPLY) == FAKE_MP3 * 4

    async def test_a_fully_failed_reply_counts_as_one_breaker_failure_not_one_per_sentence(self):
        FakeCommunicate.rules = {"": "fail"}
        [p async for p in tts_service.synthesize_ordered(REPLY)]
        assert tts_service._tts_consecutive_failures == 1

    async def test_partial_success_keeps_the_breaker_closed(self):
        FakeCommunicate.rules = {"Second": "fail"}
        [p async for p in tts_service.synthesize_ordered(REPLY)]
        assert tts_service._tts_consecutive_failures == 0 and tts_service.is_tts_service_available()

    async def test_breaker_open_skips_the_network_but_still_returns_every_sentence(self):
        for _ in range(tts_service.TTS_FAILURE_THRESHOLD):
            tts_service.record_tts_failure("403")
        parts = [p async for p in tts_service.synthesize_ordered(REPLY)]
        assert len(parts) == 4 and not any(p.audio for p in parts)
        assert FakeCommunicate.calls == []


class TestSentenceSplitting:
    def test_merges_tiny_fragments_forward(self):
        assert tts_service.split_sentences("Great. Tell me about your last project today.") == [
            "Great. Tell me about your last project today."
        ]

    def test_keeps_a_trailing_fragment_with_the_previous_sentence(self):
        out = tts_service.split_sentences("Now describe the architecture you chose for it. Why?")
        assert out == ["Now describe the architecture you chose for it. Why?"]

    def test_splits_oversized_sentences_at_clause_boundaries(self):
        long = ("word " * 30).strip() + ", " + ("more " * 30).strip() + "."
        out = tts_service.split_sentences(long)
        assert len(out) >= 2 and all(len(c) <= tts_service.MAX_CHUNK_CHARS for c in out)
        assert " ".join(out).replace(" ,", ",") .split() == long.split()

    def test_blank_text(self):
        assert tts_service.split_sentences("   ") == [] and tts_service.split_sentences("") == []


# ---------------------------------------------------------------- /respond-stream (SSE)

def parse_sse(text):
    events = []
    for block in text.strip().split("\n\n"):
        lines = block.splitlines()
        name = next(l[7:] for l in lines if l.startswith("event: "))
        data = json.loads(next(l[6:] for l in lines if l.startswith("data: ")))
        events.append((name, data))
    return events


class TestRespondStream:
    def test_sends_text_first_then_audio_in_order_then_done(self, client):
        res = client.post(f"{BASE}/respond-stream", json=TURN)
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        assert res.headers["cache-control"] == "no-cache"

        events = parse_sse(res.text)
        names = [n for n, _ in events]
        assert names[0] == "turn" and names[-1] == "done"
        assert set(names[1:-1]) == {"audio"}

        turn = events[0][1]
        assert turn["text"] == AI_TEXT and turn["stage"] == "intro" and turn["isComplete"] is False
        assert turn["sentences"] == tts_service.split_sentences(AI_TEXT)

        audio = [d for n, d in events if n == "audio"]
        assert [a["index"] for a in audio] == list(range(len(turn["sentences"])))
        assert [a["sentence"] for a in audio] == turn["sentences"]
        assert audio[-1]["is_final"] and all(decode(a["audio"]) == FAKE_MP3 for a in audio)

    def test_audio_stays_ordered_when_a_later_sentence_is_faster(self, client):
        FakeCommunicate.rules = {"Welcome": 0.2}
        audio = [d for n, d in parse_sse(client.post(f"{BASE}/respond-stream", json=TURN).text) if n == "audio"]
        assert [a["index"] for a in audio] == [0, 1]

    def test_tts_outage_still_delivers_text_and_every_sentence_with_empty_audio(self, client):
        FakeCommunicate.rules = {"": "fail"}
        events = parse_sse(client.post(f"{BASE}/respond-stream", json=TURN).text)
        assert events[0][1]["text"] == AI_TEXT
        audio = [d for n, d in events if n == "audio"]
        assert len(audio) == 2 and all(a["audio"] == "" for a in audio)
        assert events[-1][0] == "done"

    def test_forwards_the_requested_voice(self, client):
        client.post(f"{BASE}/respond-stream", json={**TURN, "voice": "en-US-JennyNeural"})
        assert {c[1] for c in FakeCommunicate.calls} == {"en-US-JennyNeural"}

    def test_llm_failure_is_a_normal_http_error_not_a_broken_stream(self, client, monkeypatch):
        monkeypatch.setattr(voice_routes, "run_interviewer_agent", lambda s: {})
        res = client.post(f"{BASE}/respond-stream", json=TURN)
        assert res.status_code == 503 and "text/event-stream" not in res.headers["content-type"]


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
