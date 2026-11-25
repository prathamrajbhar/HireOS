import io
import logging
import math
import re
from typing import Any, List, Optional, Tuple

from core.config import settings

logger = logging.getLogger("stt_service")

STT_MODEL = "whisper-large-v3-turbo"

# Whisper drops a segment when it is probably silence/noise: it reports a high no-speech
# probability together with a low average log-probability.
NO_SPEECH_PROB_LIMIT = 0.6
LOW_LOGPROB_LIMIT = -1.0

# NOTE: Whisper reports no_speech_prob=0 even for pure silence (it then says "Thank you."), so the
# server cannot reliably detect silence. The browser's voice-activity detector must never send it;
# the server only removes output that is clearly not speech (punctuation only, known phantom phrases).

# Phrases Whisper invents for silence/noise; never a real interview answer.
PHANTOM_PHRASES = {
    "you",
    "thanks for watching",
    "thank you for watching",
    "please subscribe",
    "subtitles by the amara.org community",
}

groq_client = None
if settings.groq_api_key and settings.groq_api_key != "your_groq_api_key_here":
    try:
        from groq import Groq
        groq_client = Groq(api_key=settings.groq_api_key)
        logger.info("Groq Whisper STT client initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize Groq client: {e}")


class SttUnavailableError(RuntimeError):
    """The speech-to-text provider is not configured or failed. Distinct from 'no speech heard'."""


def _field(obj: Any, name: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _is_speech(text: str) -> bool:
    return any(ch.isalnum() for ch in text)


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9. ]+", "", text.lower()).strip(" .")


def clean_transcription(response: Any) -> Tuple[str, Optional[float]]:
    """Builds (text, confidence) from a verbose_json response, dropping silence/noise segments."""
    segments: List[Any] = _field(response, "segments") or []

    if not segments:
        text = (_field(response, "text") or "").strip()
        return ("" if not _is_speech(text) or _normalize(text) in PHANTOM_PHRASES else text), None

    kept_text: List[str] = []
    confidences: List[float] = []
    for seg in segments:
        no_speech = _field(seg, "no_speech_prob", 0.0) or 0.0
        logprob = _field(seg, "avg_logprob", 0.0) or 0.0
        if no_speech > NO_SPEECH_PROB_LIMIT and logprob < LOW_LOGPROB_LIMIT:
            continue
        piece = (_field(seg, "text") or "").strip()
        if piece:
            kept_text.append(piece)
            confidences.append(math.exp(min(0.0, logprob)))

    text = " ".join(kept_text).strip()
    if not _is_speech(text) or _normalize(text) in PHANTOM_PHRASES:
        return "", None
    confidence = round(sum(confidences) / len(confidences), 3) if confidences else None
    return text, confidence


def transcribe_audio_bytes(
    audio_bytes: bytes, filename: str = "audio.webm", language: str = "en"
) -> Tuple[str, Optional[float]]:
    """Transcribes audio with Groq Whisper.

    Returns ("", None) when no speech was heard. Raises SttUnavailableError when the provider is
    missing or fails, so callers can tell the candidate instead of silently hearing nothing.
    """
    if not audio_bytes:
        return "", None

    if groq_client is None:
        raise SttUnavailableError("Speech-to-text is not configured (GROQ_API_KEY missing).")

    try:
        response = groq_client.audio.transcriptions.create(
            file=(filename, io.BytesIO(audio_bytes)),
            model=STT_MODEL,
            response_format="verbose_json",
            language=language,
            temperature=0.0,
        )
    except Exception as e:
        logger.error(f"Groq Whisper transcription failed: {e}")
        raise SttUnavailableError(f"Speech-to-text provider error: {e}") from e

    text, confidence = clean_transcription(response)
    logger.info(f"Groq Whisper transcribed {len(audio_bytes)} bytes -> {len(text)} chars")
    return text, confidence
