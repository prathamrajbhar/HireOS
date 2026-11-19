import json
import logging
import re
from typing import Any, List, Optional

from core.config import settings

logger = logging.getLogger("llm_service")

_client: Optional[Any] = None
_client_initialized = False

_groq_client: Optional[Any] = None
_groq_client_initialized = False

def get_client() -> Optional[Any]:
    global _client, _client_initialized
    if _client_initialized:
        return _client
    _client_initialized = True
    if not settings.gemini_api_key:
        return None
    try:
        from google import genai
        _client = genai.Client(api_key=settings.gemini_api_key)
    except Exception as e:
        logger.warning(f"Failed to initialize GenAI client: {e}")
        _client = None
    return _client

def get_groq_client() -> Optional[Any]:
    global _groq_client, _groq_client_initialized
    if _groq_client_initialized:
        return _groq_client
    _groq_client_initialized = True
    if not settings.groq_api_key:
        return None
    try:
        from groq import Groq
        _groq_client = Groq(api_key=settings.groq_api_key)
    except Exception as e:
        logger.warning(f"Failed to initialize Groq client: {e}")
        _groq_client = None
    return _groq_client

def _generate_text_ollama(prompt: str) -> Optional[str]:
    if not settings.ollama_base_url or not prompt:
        return None
    try:
        import httpx
        url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"
        payload = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2
            }
        }
        logger.info(f"Attempting Ollama generation using model {settings.ollama_model} at {url}...")
        response = httpx.post(url, json=payload, timeout=180.0)
        response.raise_for_status()
        data = response.json()
        text = data.get("response")
        return text.strip() if text else None
    except Exception as e:
        logger.error(f"Ollama generate_content failed: {e}")
        raise

def _generate_text_groq(prompt: str) -> Optional[str]:
    client = get_groq_client()
    if not client or not prompt:
        return None
    try:
        logger.info(f"Attempting Groq generation using model {settings.groq_model}...")
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=settings.groq_model,
            temperature=0.2,
        )
        text = completion.choices[0].message.content
        return text.strip() if text else None
    except Exception as e:
        logger.error(f"Groq generate_content failed: {e}")
        raise

def _extract_gemini_text(response: Any) -> Optional[str]:
    """Robustly extracts generated text from a Google GenAI response object."""
    if not response:
        return None

    # First attempt: standard .text property
    try:
        raw_text = getattr(response, "text", None)
        if isinstance(raw_text, str) and raw_text.strip():
            return raw_text.strip()
    except Exception as e:
        logger.debug(f"Direct response.text access raised: {e}")

    # Fallback attempt: inspect candidates and parts
    candidates = getattr(response, "candidates", None)
    if not candidates:
        logger.warning("Gemini response returned no candidates.")
        return None

    first_cand = candidates[0]
    finish_reason = getattr(first_cand, "finish_reason", None)
    content = getattr(first_cand, "content", None)
    parts = getattr(content, "parts", None) if content else None

    if not parts:
        logger.warning(f"Gemini candidate has no content parts. finish_reason: {finish_reason}")
        return None

    # Extract non-thought text parts first
    text_chunks: List[str] = []
    for part in parts:
        part_text = getattr(part, "text", None)
        is_thought = getattr(part, "thought", False)
        if isinstance(part_text, str) and part_text.strip():
            if not is_thought:
                text_chunks.append(part_text)

    # If no non-thought text parts exist, check all text parts
    if not text_chunks:
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                text_chunks.append(part_text)

    if text_chunks:
        joined = "".join(text_chunks).strip()
        if joined:
            return joined

    logger.warning(f"Gemini candidate returned parts without text. finish_reason: {finish_reason}")
    return None

import time

def generate_text(prompt: str, force_provider: Optional[str] = None) -> Optional[str]:
    if not prompt:
        return None

    provider = (force_provider or settings.llm_provider).lower()
    max_retries = 3
    delay = 2.0

    for attempt in range(max_retries):
        try:
            if provider == "groq":
                return _generate_text_groq(prompt)

            elif provider == "gemini":
                client = get_client()
                if not client:
                    logger.error("Gemini API key is not configured.")
                    return None
                try:
                    from google.genai import types
                    config = types.GenerateContentConfig(
                        http_options=types.HttpOptions(timeout=20000),
                        temperature=0.3,
                        max_output_tokens=700,
                    )
                    response = client.models.generate_content(
                        model=settings.gemini_model,
                        contents=prompt,
                        config=config,
                    )
                except (ImportError, AttributeError):
                    response = client.models.generate_content(
                        model=settings.gemini_model,
                        contents=prompt,
                    )
                return _extract_gemini_text(response)

            elif provider == "ollama":
                return _generate_text_ollama(prompt)

        except Exception as e:
            is_rate_limit = False
            err_str = str(e).lower()
            if any(k in err_str for k in (
                "429", "resource_exhausted", "too many requests",
                "503", "unavailable", "high demand", "504", "deadline_exceeded",
                "deadline expired", "temporarily", "timeout", "timed out", "connection reset"
            )):
                is_rate_limit = True

            if is_rate_limit and attempt < max_retries - 1:
                logger.warning(
                    f"LLM generation rate limited or transient error ({e}). Retrying in {delay}s... (Attempt {attempt + 1}/{max_retries})"
                )
                time.sleep(delay)
                delay *= 2
                continue

            logger.error(f"LLM generation failed: {e}")
            raise e

    return None

def _strip_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()

def _repair_json_string(text: str) -> str:
    # Strip trailing commas right before closing object/array braces
    return re.sub(r',\s*([}\]])', r'\1', text)

def extract_json_object(text: str, allow_repair: bool = False) -> Optional[dict]:
    if not text:
        return None

    cleaned = _strip_markdown_fences(text)

    # 1. Direct JSON parse
    try:
        data = json.loads(cleaned, strict=False)
        if isinstance(data, dict):
            return data
    except (ValueError, TypeError):
        pass

    # 2. Balanced search from every '{'
    start = 0
    while True:
        pos = cleaned.find('{', start)
        if pos == -1:
            break
        extracted = _extract_balanced(cleaned, pos, '{', '}', dict, allow_repair=allow_repair)
        if extracted is not None:
            return extracted
        start = pos + 1

    # 3. Clean trailing commas and retry if repair is permitted
    if allow_repair:
        repaired = _repair_json_string(cleaned)
        if repaired != cleaned:
            try:
                data = json.loads(repaired, strict=False)
                if isinstance(data, dict):
                    return data
            except (ValueError, TypeError):
                pass

            start = 0
            while True:
                pos = repaired.find('{', start)
                if pos == -1:
                    break
                extracted = _extract_balanced(repaired, pos, '{', '}', dict, allow_repair=True)
                if extracted is not None:
                    return extracted
                start = pos + 1

    return None

def extract_json_array(text: str, allow_repair: bool = False) -> Optional[List[Any]]:
    if not text:
        return None

    cleaned = _strip_markdown_fences(text)

    # 1. Direct JSON parse
    try:
        data = json.loads(cleaned, strict=False)
        if isinstance(data, list):
            return data
    except (ValueError, TypeError):
        pass

    # 2. Balanced search from every '['
    start = 0
    while True:
        pos = cleaned.find('[', start)
        if pos == -1:
            break
        extracted = _extract_balanced(cleaned, pos, '[', ']', list, allow_repair=allow_repair)
        if extracted is not None:
            return extracted
        start = pos + 1

    # 3. Clean trailing commas and retry if repair is permitted
    if allow_repair:
        repaired = _repair_json_string(cleaned)
        if repaired != cleaned:
            try:
                data = json.loads(repaired, strict=False)
                if isinstance(data, list):
                    return data
            except (ValueError, TypeError):
                pass

            start = 0
            while True:
                pos = repaired.find('[', start)
                if pos == -1:
                    break
                extracted = _extract_balanced(repaired, pos, '[', ']', list, allow_repair=True)
                if extracted is not None:
                    return extracted
                start = pos + 1

    return None

def _extract_balanced(text: str, start: int, open_ch: str, close_ch: str, target_type, allow_repair: bool = False) -> Optional[Any]:
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        char = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == open_ch:
            depth += 1
        elif char == close_ch:
            depth -= 1
            if depth == 0:
                raw_substr = text[start:i + 1]
                try:
                    data = json.loads(raw_substr, strict=False)
                    return data if isinstance(data, target_type) else None
                except (ValueError, TypeError):
                    if allow_repair:
                        cleaned_substr = _repair_json_string(raw_substr)
                        try:
                            data = json.loads(cleaned_substr, strict=False)
                            return data if isinstance(data, target_type) else None
                        except (ValueError, TypeError):
                            return None
                    return None
    return None
