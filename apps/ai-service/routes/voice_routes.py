import logging
import asyncio
import base64
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, File, UploadFile, Body, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
import json
from pydantic import BaseModel, Field
from agents.interviewer_agent import run_interviewer_agent, InterviewerState
from workers.resume_builder_worker import process_resume_builder_job

from services.stt_tts.stt_service import SttUnavailableError, transcribe_audio_bytes
from services.stt_tts.tts_service import (
    generate_tts_audio_base64,
    split_sentences,
    stream_sentence_tts,
    synthesize_ordered,
    to_data_uri,
)
from core.config import settings

logger = logging.getLogger("voice_routes")

voice_router = APIRouter(prefix="/api/v1/ai/interview", tags=["voice-interview"])

MAX_TRANSCRIBE_BYTES = 10 * 1024 * 1024

class GenerateResumeRequest(BaseModel):
    sessionId: str
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    memory: Optional[Dict[str, Any]] = None
    profileType: Optional[str] = None
    existingResume: Optional[str] = None
    careerGoals: Optional[str] = None

class TranscribeRequest(BaseModel):
    audio_base64: Optional[str] = None
    language: Optional[str] = "en"

class TranscribeResponse(BaseModel):
    transcript: str
    confidence: Optional[float] = None
    no_speech: bool = False

class InterviewRespondRequest(BaseModel):
    interviewId: str
    applicationId: Optional[str] = None
    transcript: str
    turnNumber: int = 0
    stage: str = "intro"
    candidateResume: Optional[str] = None
    candidateContext: Optional[Dict[str, Any]] = None
    requiredSkills: Optional[List[str]] = None
    jobRubric: Optional[Dict[str, Any]] = None
    jobTitle: Optional[str] = None
    conversationHistory: List[Dict[str, Any]] = Field(default_factory=list)
    voice: Optional[str] = "en-US-ChristopherNeural"

class InterviewRespondResponse(BaseModel):
    text: str
    audioUrl: Optional[str] = None
    stage: str
    isComplete: bool = False
    scorecard: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None
    turnRecord: Optional[Dict[str, Any]] = None
    evaluatedSkills: Optional[List[str]] = None
    remainingSkills: Optional[List[str]] = None
    currentSkill: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-ChristopherNeural"

class TTSResponse(BaseModel):
    audio_url: str
    audio_format: str = "mp3"

@voice_router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    request: Request,
    file: Optional[UploadFile] = File(None),
    language: str = "en",
):
    logger.info("Voice: Received audio transcription request")

    audio_bytes = None
    filename = "audio.webm"

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict) and body.get("audio_base64"):
                audio_bytes = base64.b64decode(body["audio_base64"])
        except Exception as e:
            logger.error(f"Voice: Failed to decode base64 audio payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid base64 audio payload.")

    if not audio_bytes and file:
        filename = file.filename or "audio.webm"
        audio_bytes = await file.read()
        logger.info(f"Received audio file {filename} of size {len(audio_bytes)} bytes")

    if not audio_bytes or len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="No audio provided.")

    if len(audio_bytes) > MAX_TRANSCRIBE_BYTES:
        raise HTTPException(status_code=413, detail="Audio too large. Keep answers under a few minutes.")

    try:
        transcript, confidence = await asyncio.to_thread(
            transcribe_audio_bytes, audio_bytes, filename, language
        )
    except SttUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return TranscribeResponse(transcript=transcript, confidence=confidence, no_speech=not transcript)

def _interviewer_state(request: InterviewRespondRequest) -> InterviewerState:
    state: InterviewerState = {
        "interview_id": request.interviewId,
        "application_id": request.applicationId or request.interviewId,
        "current_stage": request.stage,
        "turn_number": request.turnNumber,
        "job_title": request.jobTitle,
        "latest_candidate_response": request.transcript,
        "conversation_history": request.conversationHistory or [],
        "candidate_resume": request.candidateResume,
        "candidate_context": request.candidateContext,
        "job_rubric": request.jobRubric,
    }
    if request.requiredSkills:
        state["required_skills"] = request.requiredSkills
    return state


async def _run_interviewer_turn(request: InterviewRespondRequest) -> Dict[str, Any]:
    """Runs the interviewer agent for one turn; raises 503 if the LLM produced nothing."""
    output_state = await asyncio.to_thread(run_interviewer_agent, _interviewer_state(request))
    if not output_state.get("latest_ai_response"):
        raise HTTPException(status_code=503, detail="Interviewer LLM returned no response. Try again in a moment.")
    return output_state


def _turn_fields(request: InterviewRespondRequest, output_state: Dict[str, Any]) -> Dict[str, Any]:
    turn_records = output_state.get("turn_records") or []
    return {
        "text": output_state["latest_ai_response"],
        "stage": output_state.get("current_stage", request.stage),
        "isComplete": bool(output_state.get("is_complete", False)),
        "scorecard": output_state.get("final_scorecard"),
        "analysis": output_state.get("last_analysis"),
        "turnRecord": turn_records[-1] if turn_records else None,
        "evaluatedSkills": output_state.get("evaluated_skills") or [],
        "remainingSkills": output_state.get("skills_to_evaluate") or [],
        "currentSkill": output_state.get("current_skill"),
    }


def _sse(event: str, payload: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@voice_router.post("/respond", response_model=InterviewRespondResponse)
async def generate_interview_response(request: InterviewRespondRequest):
    logger.info(f"Voice: Generating turn response for interview {request.interviewId}, stage {request.stage}")

    output_state = await _run_interviewer_turn(request)
    fields = _turn_fields(request, output_state)
    audio_url = await generate_tts_audio_base64(fields["text"], voice=request.voice or "en-US-ChristopherNeural")
    return InterviewRespondResponse(audioUrl=audio_url, **fields)

@voice_router.post("/respond-stream")
async def stream_interview_response(request: InterviewRespondRequest):
    """Server-sent events: the reply text first, then each sentence's audio as soon as it is ready.

    The LLM runs before the stream opens, so its failures are ordinary HTTP errors. If the client
    disconnects (candidate ended or left), the generator is cancelled and pending synthesis stops.
    """
    logger.info(f"Voice: Streaming turn response for interview {request.interviewId}, stage {request.stage}")

    output_state = await _run_interviewer_turn(request)
    fields = _turn_fields(request, output_state)
    sentences = split_sentences(fields["text"])

    async def events():
        yield _sse("turn", {**fields, "sentences": sentences})
        try:
            async for part in synthesize_ordered(fields["text"], voice=request.voice or "en-US-ChristopherNeural"):
                yield _sse("audio", {
                    "index": part.index,
                    "sentence": part.sentence,
                    "audio": to_data_uri(part.audio),
                    "is_final": part.is_final,
                })
            yield _sse("done", {})
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"Voice: streaming synthesis failed: {e}", exc_info=True)
            yield _sse("error", {"message": "Voice synthesis failed."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@voice_router.post("/tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    logger.info(f"Voice: Generating TTS for text length {len(request.text)}")
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text parameter cannot be empty.")

    audio_url = await generate_tts_audio_base64(request.text, voice=request.voice or "en-US-ChristopherNeural")
    return TTSResponse(audio_url=audio_url, audio_format="mp3")

@voice_router.post("/voice-stream")
async def voice_stream_response(request: InterviewRespondRequest):
    output_state = await _run_interviewer_turn(request)
    ai_text = output_state["latest_ai_response"]

    async def event_generator():
        async for chunk in stream_sentence_tts(ai_text, voice=request.voice or "en-US-ChristopherNeural"):
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@voice_router.post("/resume-builder/generate")
async def generate_resume_endpoint(request: GenerateResumeRequest, background_tasks: BackgroundTasks):
    logger.info(f"Triggering direct resume generation background task for session: {request.sessionId}")
    job_payload = {
        "sessionId": request.sessionId,
        "targetRole": request.targetRole,
        "targetCompany": request.targetCompany,
        "transcript": request.transcript,
        "memory": request.memory or {},
        "profileType": request.profileType,
        "existingResume": request.existingResume,
        "careerGoals": request.careerGoals,
    }
    background_tasks.add_task(process_resume_builder_job, job_payload)
    return {"success": True, "message": "Resume generation background task initialized"}


