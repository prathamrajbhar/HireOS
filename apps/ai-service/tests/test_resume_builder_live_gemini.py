"""
test_resume_builder_live_gemini.py
-----------------------------------
Executes live calls to Gemini to verify real-world conversation turns
and edge cases with actual LLM generation.
"""

import pytest
import os
from agents.resume_builder_agent import run_resume_builder_agent, ResumeBuilderState, ResumeBuilderTurnError
from services.llm.llm_service import get_client
from core.config import settings


@pytest.mark.skipif(not settings.gemini_api_key, reason="Gemini API key not configured")
def test_live_gemini_turns():
    client = get_client()
    assert client is not None, "GenAI client should initialize"

    state: ResumeBuilderState = {
        "session_id": "sess-live-gemini",
        "target_role": "Full Stack Engineer",
        "target_company": "Acme Corp",
        "experience_level": "Fresher (0-2 Years)",
        "current_stage": "intro",
        "turn_number": 0,
        "latest_candidate_response": "",
        "conversation_history": [],
        "memory": {},
    }

    try:
        # Turn 1: Greeting
        t1 = run_resume_builder_agent(state)
        assert t1["turn_number"] == 1
        assert t1["latest_ai_response"]
        assert len(t1["latest_ai_response"]) > 10
    except ResumeBuilderTurnError as e:
        err_msg = str(e) + " " + str(getattr(e, '__cause__', '')) + " " + str(getattr(e, '__context__', ''))
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower():
            pytest.skip("Gemini API daily quota limit reached on free tier.")
        raise
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower():
            pytest.skip("Gemini API daily quota limit reached on free tier.")
        raise
