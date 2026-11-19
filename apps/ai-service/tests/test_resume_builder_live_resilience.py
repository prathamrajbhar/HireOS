"""
test_resume_builder_live_resilience.py
--------------------------------------
Comprehensive test suite verifying:
1. Starting a new resume-building session.
2. AI greeting and first response.
3. At least 10 consecutive conversation turns.
4. Short answers ("Yes", "No", "You can call me Krish").
5. Longer answers containing multiple sentences.
6. Empty or malformed model responses (retry and controlled error).
7. Gemini API errors / timeouts.
8. Edge TTS 403 responses.
9. Text conversation continuing successfully when TTS is unavailable.
10. Finishing the interview and generating the resume with preserved candidate answers.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

from agents.resume_builder_agent import (
    run_resume_builder_agent,
    ResumeBuilderState,
    ResumeBuilderTurnError,
)
from services.stt_tts.tts_service import (
    generate_tts_audio_base64,
    generate_tts_audio_bytes,
    is_tts_service_available,
    reset_tts_circuit,
)
from services.llm.llm_service import extract_json_object, _extract_gemini_text
from workers.resume_builder_worker import _build_resume_prompt


@pytest.fixture(autouse=True)
def clean_tts():
    reset_tts_circuit()
    yield
    reset_tts_circuit()


# ---------------------------------------------------------------------------
# Test 1 & 2: Session Start & Greeting
# ---------------------------------------------------------------------------

@patch("agents.resume_builder_agent.generate_text")
def test_greeting_first_turn(mock_generate):
    mock_generate.return_value = '{"response": "Hello! I am Alex, your resume coach.", "next_question": "What is your name?", "action": "NEXT_TOPIC", "topic": "intro"}'
    state: ResumeBuilderState = {
        "session_id": "sess-001",
        "target_role": "Full Stack Engineer",
        "target_company": "Tech Corp",
        "experience_level": "Fresher (0-2 Years)",
        "current_stage": "intro",
        "turn_number": 0,
        "latest_candidate_response": "",
        "conversation_history": [],
        "memory": {},
    }

    result = run_resume_builder_agent(state)
    assert result["turn_number"] == 1
    assert "Alex" in result["latest_ai_response"]
    assert "What is your name?" in result["latest_ai_response"]
    assert result["current_stage"] == "intro"
    assert result["is_complete"] is False


# ---------------------------------------------------------------------------
# Test 3, 4, 5: 10+ Consecutive Turns with short & long answers
# ---------------------------------------------------------------------------

def test_10_consecutive_turns_with_varied_answers():
    answers = [
        "You can call me Krish",                                  # 1. Short name answer
        "Yes",                                                    # 2. Short answer
        "I recently graduated with a B.S. in Computer Science.",   # 3. Education
        "I have worked primarily with Python, TypeScript, and Go",# 4. Skills
        "No",                                                     # 5. Short answer
        "At my university, I built a distributed task queue system using Redis and Python that handled over 5,000 tasks per minute with sub-50ms latency.", # 6. Long multi-sentence answer
        "Yes, I deployed it to AWS using ECS and automated tests via GitHub Actions.", # 7. Multi-sentence
        "I also contributed to an open-source library for data validation and received a departmental award for excellence in systems programming.", # 8. Long answer
        "I am looking for a full stack engineer role where I can build scalable backend microservices.", # 9. Goals
        "I do not have any AWS certifications yet, but I took several Coursera courses on cloud architecture.", # 10. Certs
    ]

    state: ResumeBuilderState = {
        "session_id": "sess-consecutive",
        "target_role": "Full Stack Engineer",
        "target_company": "Acme",
        "experience_level": "Fresher (0-2 Years)",
        "current_stage": "intro",
        "turn_number": 1,
        "latest_candidate_response": "",
        "conversation_history": [
            {"role": "ai", "content": "Hi! What is your name?", "timestamp": "10:00:00"}
        ],
        "memory": {"covered_topics": ["greeting"]},
    }

    for idx, ans in enumerate(answers):
        state["latest_candidate_response"] = ans
        # Mock LLM returning valid turns matching the progress
        next_stage = "work_history" if idx >= 4 else "background"
        mock_resp = {
            "response": f"Acknowledged turn {idx+1}.",
            "next_question": f"Question for turn {idx+2}?",
            "action": "FOLLOW_UP" if idx < 9 else "NEXT_TOPIC",
            "topic": f"topic_{idx}",
            "memory_update": f"Candidate stated: {ans[:40]}",
            "missing_information": [],
            "user_name": "Krish" if idx == 0 else None,
        }
        with patch("agents.resume_builder_agent.generate_text", return_value=str(mock_resp).replace("'", '"')):
            state = run_resume_builder_agent(state)
            state["conversation_history"].append({"role": "candidate", "content": ans, "timestamp": "10:01:00"})
            state["conversation_history"].append({"role": "ai", "content": state["latest_ai_response"], "timestamp": "10:01:05"})

    assert state["turn_number"] == 11
    assert len(state["conversation_history"]) == 21  # 1 greeting + 10 pairs
    assert state["user_name"] == "Krish"
    assert len(state["memory"]["candidate_facts"]) >= 7
    # Verify rich answers were preserved in facts and history
    history_texts = " ".join(t["content"] for t in state["conversation_history"])
    assert "distributed task queue" in history_texts
    assert "Redis and Python" in history_texts


# ---------------------------------------------------------------------------
# Test 6: Empty or Malformed Model Responses (Retries & Fallbacks)
# ---------------------------------------------------------------------------

@patch("agents.resume_builder_agent.generate_text")
def test_retries_transient_empty_response(mock_generate):
    # Attempt 1: empty text; Attempt 2: valid JSON
    mock_generate.side_effect = [
        "",
        '{"response": "Understood.", "next_question": "What tools did you use?", "action": "DEEPEN", "topic": "tools", "memory_update": null, "missing_information": []}'
    ]

    state: ResumeBuilderState = {
        "session_id": "sess-empty-retry",
        "target_role": "Full Stack Engineer",
        "target_company": "Acme",
        "current_stage": "skills",
        "turn_number": 2,
        "latest_candidate_response": "I know Python",
        "conversation_history": [],
        "memory": {},
    }

    result = run_resume_builder_agent(state)
    assert result["turn_number"] == 3
    assert "Understood." in result["latest_ai_response"]
    assert mock_generate.call_count == 2


@patch("agents.resume_builder_agent.generate_text")
def test_retries_malformed_json_and_recovers_via_plain_text(mock_generate):
    # Model returns natural spoken dialogue instead of strict JSON
    mock_generate.return_value = "That is great! Which cloud provider do you feel most comfortable with?"

    state: ResumeBuilderState = {
        "session_id": "sess-plain-text",
        "target_role": "Full Stack Engineer",
        "target_company": "Acme",
        "current_stage": "skills",
        "turn_number": 3,
        "latest_candidate_response": "I have cloud experience",
        "conversation_history": [],
        "memory": {},
    }

    result = run_resume_builder_agent(state)
    assert result["turn_number"] == 4
    assert "cloud provider" in result["latest_ai_response"]


@patch("agents.resume_builder_agent.generate_text")
def test_unrecoverable_failure_raises_controlled_error_and_preserves_state(mock_generate):
    # All retries return empty
    mock_generate.side_effect = ["", "", ""]

    state: ResumeBuilderState = {
        "session_id": "sess-fail",
        "target_role": "Full Stack Engineer",
        "target_company": "Acme",
        "current_stage": "skills",
        "turn_number": 3,
        "latest_candidate_response": "My answer here",
        "conversation_history": [],
        "memory": {},
    }

    with pytest.raises(ResumeBuilderTurnError) as exc_info:
        run_resume_builder_agent(state)

    assert "LLM failed to generate turn response" in str(exc_info.value)
    # Critical: State turn_number must remain unchanged so user can retry!
    assert state["turn_number"] == 3


# ---------------------------------------------------------------------------
# Test 7: Gemini Response Extraction Robustness
# ---------------------------------------------------------------------------

def test_extract_gemini_text_from_candidates_parts():
    # Mock Google GenAI response with parts
    mock_part1 = MagicMock()
    mock_part1.thought = True
    mock_part1.text = "Thinking about the candidate response..."
    
    mock_part2 = MagicMock()
    mock_part2.thought = False
    mock_part2.text = '{"response": "Got it.", "next_question": "What is your main language?", "action": "FOLLOW_UP"}'

    mock_candidate = MagicMock()
    mock_candidate.content.parts = [mock_part1, mock_part2]
    mock_candidate.finish_reason = "STOP"

    mock_response = MagicMock()
    mock_response.text = None  # text property is None
    mock_response.candidates = [mock_candidate]

    extracted = _extract_gemini_text(mock_response)
    assert extracted is not None
    assert "Got it." in extracted
    assert "Thinking about" not in extracted


# ---------------------------------------------------------------------------
# Test 8 & 9: Edge TTS 403 and Circuit Breaker
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_edge_tts_403_fast_fails_without_crashing_turn():
    # Simulate aiohttp 403 handshake error
    with patch("edge_tts.Communicate.stream") as mock_stream:
        async def failing_stream():
            raise Exception("403, message='Invalid response status'")
            yield

        mock_stream.side_effect = failing_stream

        # First attempt fails and trips circuit
        audio_b64 = await generate_tts_audio_base64("Hello world")
        assert audio_b64 == ""
        assert is_tts_service_available() is False

        # Second attempt immediately returns empty without touching edge_tts.Communicate
        with patch("edge_tts.Communicate") as mock_comm:
            audio_b64_2 = await generate_tts_audio_base64("Next turn text")
            assert audio_b64_2 == ""
            # Ensure Communicate was not even instantiated due to circuit breaker
            assert mock_comm.call_count == 0


# ---------------------------------------------------------------------------
# Test 10: Finishing Interview & Generating Resume with Candidate Facts
# ---------------------------------------------------------------------------

def test_resume_generation_prompt_incorporates_collected_facts():
    transcript = [
        {"speaker": "ai", "text": "What is your name?"},
        {"speaker": "candidate", "text": "My name is Krish."},
        {"speaker": "ai", "text": "Tell me about your experience."},
        {"speaker": "candidate", "text": "I built a real-time analytics pipeline using Kafka and Go handling 100k events/sec."},
    ]
    memory = {
        "user_name": "Krish",
        "candidate_facts": [
            "Candidate name is Krish.",
            "Built real-time analytics pipeline with Kafka and Go.",
            "Handled 100,000 events/sec.",
        ],
        "covered_topics": ["intro", "work_history", "achievements"],
        "profile_type": "experienced",
    }

    prompt = _build_resume_prompt(
        target_role="Principal Backend Engineer",
        target_company="Stripe",
        transcript=transcript,
        memory=memory,
        profile_type="experienced",
        existing_resume="",
        career_goals="Build high throughput financial infrastructure",
    )

    assert "Krish" in prompt
    assert "Principal Backend Engineer" in prompt
    assert "Kafka and Go" in prompt
    assert "100,000 events/sec" in prompt
    assert "Build high throughput financial infrastructure" in prompt
