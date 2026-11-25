import asyncio
import base64
import logging
import re
import time
from dataclasses import dataclass
from typing import AsyncGenerator, Dict, Any, List, Optional
import edge_tts

logger = logging.getLogger("tts_service")

DEFAULT_VOICE = "en-US-ChristopherNeural"

# Circuit breaker state to prevent repeated 403 / network delays on every turn
_tts_consecutive_failures: int = 0
_tts_cooldown_until: float = 0.0
TTS_COOLDOWN_SECONDS: float = 30.0   # Short cooldown: voice should come back quickly after an outage
TTS_FAILURE_THRESHOLD: int = 3       # A single transient failure must not mute the interviewer
TTS_RETRY_DELAY_SECONDS: float = 0.4
TTS_ATTEMPTS: int = 2                # One retry per request before counting a failure
TTS_CONCURRENCY: int = 5             # Sentences synthesized at once (edge-tts is network-bound)

# Sentence chunking: tiny fragments ("Great.") are merged forward; huge ones are split at clauses.
MIN_CHUNK_CHARS: int = 15
MAX_CHUNK_CHARS: int = 240
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")

def is_tts_service_available() -> bool:
    """Returns True if the remote TTS service is operational and not in cooldown."""
    global _tts_cooldown_until
    return time.monotonic() >= _tts_cooldown_until

def record_tts_failure(error_msg: str = "") -> None:
    """Records a failure and trips the circuit breaker to prevent conversation turn latency."""
    global _tts_consecutive_failures, _tts_cooldown_until
    _tts_consecutive_failures += 1
    if _tts_consecutive_failures >= TTS_FAILURE_THRESHOLD:
        _tts_cooldown_until = time.monotonic() + TTS_COOLDOWN_SECONDS
        logger.warning(
            f"Edge TTS service unavailable ({error_msg or 'handshake failed'}). "
            f"Tripping circuit breaker for {int(TTS_COOLDOWN_SECONDS)}s. "
            "Conversations will continue seamlessly with browser client speech synthesis."
        )

def record_tts_success() -> None:
    """Resets failure counters after a successful synthesis."""
    global _tts_consecutive_failures, _tts_cooldown_until
    _tts_consecutive_failures = 0
    _tts_cooldown_until = 0.0

def reset_tts_circuit() -> None:
    """Explicitly resets circuit breaker (useful for testing or reconnects)."""
    record_tts_success()

class TtsSynthesisError(RuntimeError):
    """Edge TTS produced no audio after all attempts."""


@dataclass
class SentenceAudio:
    index: int
    sentence: str
    audio: bytes
    is_final: bool


def split_sentences(text: str) -> List[str]:
    """Splits a reply into speakable chunks: sentence-sized, never tiny, never huge."""
    raw = [s.strip() for s in _SENTENCE_BOUNDARY.split((text or "").strip()) if s.strip()]

    pieces: List[str] = []
    for sentence in raw:
        while len(sentence) > MAX_CHUNK_CHARS:
            window = sentence[:MAX_CHUNK_CHARS]
            cut = max(window.rfind(","), window.rfind(";"), window.rfind(" "))
            if cut < MIN_CHUNK_CHARS:
                cut = MAX_CHUNK_CHARS - 1
            pieces.append(sentence[: cut + 1].strip())
            sentence = sentence[cut + 1:].strip()
        if sentence:
            pieces.append(sentence)

    chunks: List[str] = []
    carry = ""
    for piece in pieces:
        current = f"{carry} {piece}".strip() if carry else piece
        if len(current) < MIN_CHUNK_CHARS:
            carry = current
        else:
            chunks.append(current)
            carry = ""
    if carry:
        if chunks:
            chunks[-1] = f"{chunks[-1]} {carry}"
        else:
            chunks.append(carry)
    return chunks


async def _edge_synthesize(text: str, voice: str) -> bytes:
    """One synthesis with a retry. No circuit-breaker bookkeeping; raises TtsSynthesisError."""
    last_error = "No audio data received"
    for attempt in range(1, TTS_ATTEMPTS + 1):
        try:
            communicate = edge_tts.Communicate(text, voice)
            audio_buffer = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.extend(chunk["data"])
            if audio_buffer:
                return bytes(audio_buffer)
            last_error = "No audio data received"
        except asyncio.CancelledError:
            raise
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Edge TTS attempt {attempt}/{TTS_ATTEMPTS} failed for text length {len(text)}: {e}")
        if attempt < TTS_ATTEMPTS:
            await asyncio.sleep(TTS_RETRY_DELAY_SECONDS)
    raise TtsSynthesisError(last_error)


async def synthesize_ordered(text: str, voice: str = DEFAULT_VOICE) -> AsyncGenerator[SentenceAudio, None]:
    """Synthesizes a reply sentence by sentence, in parallel, yielding results strictly in order.

    The first sentence is available as soon as it is ready while the rest are still being
    produced. A sentence that fails yields empty audio (callers fall back to browser speech).
    Closing/cancelling the generator cancels every pending synthesis, so abandoned turns cost nothing.
    """
    sentences = split_sentences(text)
    if not sentences:
        return

    last = len(sentences) - 1
    if not is_tts_service_available():
        for i, sentence in enumerate(sentences):
            yield SentenceAudio(i, sentence, b"", i == last)
        return

    gate = asyncio.Semaphore(TTS_CONCURRENCY)

    async def synthesize(sentence: str) -> bytes:
        async with gate:
            try:
                return await _edge_synthesize(sentence, voice or DEFAULT_VOICE)
            except TtsSynthesisError:
                return b""

    tasks = [asyncio.create_task(synthesize(s)) for s in sentences]
    any_audio = False
    try:
        for i, (sentence, task) in enumerate(zip(sentences, tasks)):
            audio = await task
            any_audio = any_audio or bool(audio)
            yield SentenceAudio(i, sentence, audio, i == last)
        if any_audio:
            record_tts_success()
        else:
            record_tts_failure("every sentence failed")
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def generate_tts_audio_bytes(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    """Generates MP3 audio bytes using Edge TTS.

    Multi-sentence text is synthesized in parallel and concatenated (all-or-nothing, so a failed
    sentence can never silently drop words). Returns b"" without raising if TTS is unavailable,
    letting AI text responses continue uninterrupted.
    """
    if not text or not text.strip():
        return b""

    # Fast check: skip if circuit breaker is open to prevent delaying the turn
    if not is_tts_service_available():
        logger.debug("Edge TTS circuit breaker is OPEN. Skipping remote synthesis.")
        return b""

    cleaned_text = text.strip()
    voice_name = voice or DEFAULT_VOICE

    if len(split_sentences(cleaned_text)) > 1:
        parts = [part async for part in synthesize_ordered(cleaned_text, voice_name)]
        if all(part.audio for part in parts):
            return b"".join(part.audio for part in parts)
        return b""

    try:
        audio = await _edge_synthesize(cleaned_text, voice_name)
    except TtsSynthesisError as e:
        record_tts_failure(str(e))
        return b""
    record_tts_success()
    return audio


async def generate_tts_audio_base64(text: str, voice: str = DEFAULT_VOICE) -> str:
    """Generates a data:audio/mp3;base64 URI string or empty string if audio is unavailable."""
    audio_bytes = await generate_tts_audio_bytes(text, voice)
    if not audio_bytes:
        return ""
    b64_str = base64.b64encode(audio_bytes).decode("utf-8")
    return f"data:audio/mp3;base64,{b64_str}"


def to_data_uri(audio: bytes) -> str:
    return f"data:audio/mp3;base64,{base64.b64encode(audio).decode('utf-8')}" if audio else ""


async def stream_sentence_tts(text: str, voice: str = DEFAULT_VOICE) -> AsyncGenerator[Dict[str, Any], None]:
    if not text or not text.strip():
        yield {"sentence": "", "audio": "", "is_final": True}
        return

    async for part in synthesize_ordered(text, voice):
        yield {
            "index": part.index,
            "sentence": part.sentence,
            "audio": to_data_uri(part.audio),
            "is_final": part.is_final,
        }
