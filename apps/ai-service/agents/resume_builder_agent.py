"""
resume_builder_agent.py
------------------------
Main orchestrator for the AI Resume Builder voice conversation.
Manages state transitions, stage progression, memory, and LLM calls.
"""

import logging
from typing import Dict, Any, List, Optional
from services.llm.llm_service import generate_text, extract_json_object
from agents.resume_builder_types import (
    STAGES,
    ACTIONS,
    MAX_TURNS,
    STAGE_MIN_TURNS,
    SYSTEM_PROMPT,
    ResumeBuilderState,
)
from agents.resume_builder_memory import (
    _is_duplicate,
    _normalize_memory,
    _collect_asked_questions,
    _update_memory,
    _derive_insight,
    _next_stage,
    _stage_complete,
    _infer_profile_type,
)
from agents.resume_builder_prompts import (
    _validate_analysis,
    _fallback_parse_plain_text,
    _build_greeting_prompt,
    _build_turn_prompt,
    _build_closing_prompt,
)

logger = logging.getLogger("resume_builder_agent")


class ResumeBuilderTurnError(RuntimeError):
    """Raised when the LLM consistently fails to generate a valid turn response after retries."""
    pass


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _generate_turn(
    state: ResumeBuilderState,
    memory: Dict[str, Any],
    asked: List[str],
    target_role: str,
    target_company: str,
    max_retries: int = 2,
) -> Optional[Dict[str, Any]]:
    prompt = _build_turn_prompt(state, memory, asked, target_role, target_company)
    last_error: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        curr_prompt = prompt
        if attempt > 0:
            curr_prompt += (
                "\n\nIMPORTANT: Output ONLY a valid JSON object matching:\n"
                '{"response": "brief warm acknowledgement", "next_question": "one short question", "action": "FOLLOW_UP", '
                '"topic": "topic name", "memory_update": null, "missing_information": []}'
            )
        try:
            raw = generate_text(curr_prompt)
            if not raw or not raw.strip():
                logger.warning(
                    f"ResumeBuilderAgent: LLM returned empty response on turn attempt {attempt + 1}/{max_retries + 1}."
                )
                continue

            parsed = extract_json_object(raw, allow_repair=True)
            validated = _validate_analysis(parsed)
            if validated:
                return validated

            plain_parsed = _fallback_parse_plain_text(raw)
            if plain_parsed:
                logger.info(
                    f"ResumeBuilderAgent: Parsed conversational turn from plain text on attempt {attempt + 1}."
                )
                return plain_parsed

            logger.warning(
                f"ResumeBuilderAgent: Invalid analysis structure on attempt {attempt + 1}/{max_retries + 1}."
            )
        except Exception as e:
            last_error = e
            logger.warning(f"ResumeBuilderAgent: Error during turn generation attempt {attempt + 1}: {e}")
            if attempt < max_retries:
                import time
                time.sleep(1.0)

    if last_error:
        raise ResumeBuilderTurnError(f"ResumeBuilderAgent: LLM failed to generate turn response: {last_error}") from last_error
    return None


def _compose_response(analysis: Dict[str, Any]) -> str:
    parts = []
    if analysis.get("response"):
        parts.append(analysis["response"].strip())
    if analysis.get("next_question"):
        parts.append(analysis["next_question"].strip())
    return " ".join(p for p in parts if p).strip()


def _generate_closing(state: ResumeBuilderState, target_role: str, target_company: str, max_retries: int = 2) -> str:
    prompt = _build_closing_prompt(state, target_role, target_company)
    for attempt in range(max_retries + 1):
        try:
            closing = generate_text(prompt)
            if closing and closing.strip():
                return closing.strip()
        except Exception as e:
            logger.warning(f"ResumeBuilderAgent: Closing generation attempt {attempt + 1} failed: {e}")
    raise ResumeBuilderTurnError("ResumeBuilderAgent: LLM failed to generate closing message.")


def _handle_greeting(
    state: ResumeBuilderState,
    memory: Dict[str, Any],
    target_role: str,
    target_company: str,
    max_retries: int = 2,
) -> ResumeBuilderState:
    prompt = _build_greeting_prompt(state, target_role, target_company)
    analysis = None
    last_error: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        curr_prompt = prompt
        if attempt > 0:
            curr_prompt += (
                '\n\nIMPORTANT: Return ONLY valid JSON:\n'
                '{"response": "Warm welcome message", "next_question": "What is your name?", "action": "NEXT_TOPIC", "topic": "intro"}'
            )
        try:
            raw = generate_text(curr_prompt)
            if raw:
                parsed = extract_json_object(raw, allow_repair=True)
                analysis = _validate_analysis(parsed) or _fallback_parse_plain_text(raw)
                if analysis:
                    break
        except Exception as e:
            last_error = e
            logger.warning(f"ResumeBuilderAgent: Greeting generation attempt {attempt + 1} failed: {e}")

    if not analysis:
        logger.error("ResumeBuilderAgent: LLM failed to generate a valid greeting response.")
        if last_error:
            raise ResumeBuilderTurnError(f"ResumeBuilderAgent: LLM failed to generate greeting: {last_error}") from last_error
        raise ResumeBuilderTurnError("ResumeBuilderAgent: LLM failed to generate a valid greeting response.")

    analysis["action"] = "NEXT_TOPIC"
    analysis["topic"] = "intro"
    state["turn_number"] = 1
    state["last_analysis"] = analysis
    state["next_action"] = "NEXT_TOPIC"
    state["latest_ai_response"] = _compose_response(analysis)
    state["current_stage"] = "intro"
    state["realtime_insight"] = None
    state["is_complete"] = False
    _update_memory(memory, analysis, "", "intro")
    return state


def _route_action(
    state: ResumeBuilderState,
    analysis: Dict[str, Any],
    memory: Dict[str, Any],
) -> ResumeBuilderState:
    action = str(analysis.get("action") or "").upper()
    current_stage = state.get("current_stage") or "intro"

    if action == "END":
        state["current_stage"] = "closing"
        state["is_complete"] = True
        return state

    if action == "NEXT_TOPIC":
        # Enforce minimum turns before allowing stage advance
        if not _stage_complete(memory, current_stage):
            # Ignore NEXT_TOPIC — treat as DEEPEN and stay in current stage
            logger.info(
                f"ResumeBuilderAgent: NEXT_TOPIC rejected for stage '{current_stage}' "
                f"— minimum turns not yet met. Treating as DEEPEN."
            )
            analysis["action"] = "DEEPEN"
            state["current_stage"] = current_stage
            state["is_complete"] = False
            return state

        next_stage = _next_stage(current_stage)
        if next_stage is None or next_stage == "closing":
            state["current_stage"] = "closing"
            state["is_complete"] = True
        else:
            state["current_stage"] = next_stage
            state["is_complete"] = False
        return state

    # FOLLOW_UP / CLARIFY / DEEPEN — stay in current stage
    state["current_stage"] = current_stage
    state["is_complete"] = current_stage == "closing"
    return state


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_resume_builder_agent(state: ResumeBuilderState) -> ResumeBuilderState:
    target_role = state.get("target_role") or ""
    target_company = state.get("target_company") or ""
    current_turn = state.get("turn_number", 0)
    proposed_turn = current_turn + 1

    history = state.get("conversation_history") or []
    candidate_input = (state.get("latest_candidate_response") or "").strip()
    memory = _normalize_memory(state.get("memory"))

    # Sync profile_type and user_name from memory back to state for prompt builders
    if memory.get("profile_type") and not state.get("profile_type"):
        state["profile_type"] = memory["profile_type"]
    if memory.get("user_name") and not state.get("user_name"):
        state["user_name"] = memory["user_name"]

    # If profile_type is not yet set, initialize from experience_level
    if not state.get("profile_type") and not memory.get("profile_type"):
        exp_level_str = (state.get("experience_level") or "").lower()
        if any(w in exp_level_str for w in ["fresher", "entry", "0-2", "junior"]):
            state["profile_type"] = "fresher"
            memory["profile_type"] = "fresher"
        elif any(w in exp_level_str for w in ["senior", "lead", "staff", "architect", "5+"]):
            state["profile_type"] = "experienced"
            memory["profile_type"] = "experienced"

    # Force close when max turns reached
    if proposed_turn > MAX_TURNS and not state.get("is_complete"):
        logger.info(f"ResumeBuilderAgent: MAX_TURNS ({MAX_TURNS}) reached — forcing close.")
        state["turn_number"] = proposed_turn
        state["memory"] = memory
        state["current_stage"] = "closing"
        state["is_complete"] = True
        state["latest_ai_response"] = _generate_closing(state, target_role, target_company)
        return state

    # Greeting — first turn with no candidate input
    is_start = proposed_turn == 1 and not candidate_input and not history
    if is_start:
        return _handle_greeting(state, memory, target_role, target_company)

    # Generate turn response using candidate input
    asked = _collect_asked_questions(memory, history)
    analysis = _generate_turn(state, memory, asked, target_role, target_company)

    if not analysis:
        logger.error("ResumeBuilderAgent: LLM returned invalid or missing response for turn after retries.")
        # Note: Do NOT mutate state['turn_number'] or memory on failure to allow clean retry
        raise ResumeBuilderTurnError("ResumeBuilderAgent: LLM failed to generate turn response.")

    # Duplicate question guard — regenerate instead of silently dropping
    generated_q = analysis.get("next_question") or ""
    if generated_q and _is_duplicate(generated_q, asked):
        logger.info("ResumeBuilderAgent: Generated question duplicates a previous one — asking candidate to elaborate instead.")
        analysis["next_question"] = "Could you tell me a bit more about that?"
        analysis["action"] = "DEEPEN"

    # Commit state changes now that analysis succeeded
    state["turn_number"] = proposed_turn
    state["memory"] = memory

    current_stage = state.get("current_stage") or "intro"
    _update_memory(memory, analysis, candidate_input, current_stage)

    # Propagate name and profile type from memory to state
    if memory.get("user_name"):
        state["user_name"] = memory["user_name"]
    if memory.get("profile_type"):
        state["profile_type"] = memory["profile_type"]
    # Heuristic fallback for profile type
    if not state.get("profile_type"):
        inferred = _infer_profile_type(memory.get("candidate_facts") or [])
        if inferred:
            state["profile_type"] = inferred
            memory["profile_type"] = inferred

    state["last_analysis"] = analysis
    state["next_action"] = str(analysis.get("action") or "")
    state["latest_ai_response"] = _compose_response(analysis)
    state["realtime_insight"] = _derive_insight(analysis.get("missing_information") or [])

    _route_action(state, analysis, memory)

    # Final max-turn check after routing
    if not state.get("is_complete") and proposed_turn >= MAX_TURNS:
        state["current_stage"] = "closing"
        state["is_complete"] = True
        state["latest_ai_response"] = _generate_closing(state, target_role, target_company)

    return state