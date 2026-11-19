import base64
import logging
import re
import time
from typing import AsyncGenerator, Dict, Any, Optional
import edge_tts

logger = logging.getLogger("tts_service")

DEFAULT_VOICE = "en-US-ChristopherNeural"

# Circuit breaker state to prevent repeated 403 / network delays on every turn
_tts_consecutive_failures: int = 0
_tts_cooldown_until: float = 0.0
TTS_COOLDOWN_SECONDS: float = 120.0  # 2 minute cooldown once tripped
TTS_FAILURE_THRESHOLD: int = 1       # Fast trip on first handshake/auth failure to protect conversation speed

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

async def generate_tts_audio_bytes(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    """Generates MP3 audio bytes using Edge TTS.

    If Edge TTS is unavailable (e.g. 403 or network error), returns b"" immediately
    without raising an error, allowing AI text responses to continue uninterrupted.
    """
    if not text or not text.strip():
        return b""

    # Fast check: skip if circuit breaker is open to prevent delaying the turn
    if not is_tts_service_available():
        logger.debug("Edge TTS circuit breaker is OPEN. Skipping remote synthesis.")
        return b""

    cleaned_text = text.strip()
    voice_name = voice or DEFAULT_VOICE

    try:
        communicate = edge_tts.Communicate(cleaned_text, voice_name)
        audio_buffer = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.extend(chunk["data"])

        if audio_buffer:
            record_tts_success()
            return bytes(audio_buffer)

        record_tts_failure("No audio data received")
        return b""
    except Exception as e:
        record_tts_failure(str(e))
        logger.warning(f"Edge TTS synthesis failed for text length {len(text)}: {e}")
        return b""

async def generate_tts_audio_base64(text: str, voice: str = DEFAULT_VOICE) -> str:
    """Generates a data:audio/mp3;base64 URI string or empty string if audio is unavailable."""
    audio_bytes = await generate_tts_audio_bytes(text, voice)
    if not audio_bytes:
        return ""
    b64_str = base64.b64encode(audio_bytes).decode("utf-8")
    return f"data:audio/mp3;base64,{b64_str}"

async def stream_sentence_tts(text: str, voice: str = DEFAULT_VOICE) -> AsyncGenerator[Dict[str, Any], None]:
    if not text or not text.strip():
        yield {"sentence": "", "audio": "", "is_final": True}
        return

    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    if not sentences:
        sentences = [text.strip()]

    total_sentences = len(sentences)
    for idx, sentence in enumerate(sentences):
        audio_b64 = await generate_tts_audio_base64(sentence, voice)
        is_final = (idx == total_sentences - 1)
        yield {
            "index": idx,
            "sentence": sentence,
            "audio": audio_b64,
            "is_final": is_final,
        }
