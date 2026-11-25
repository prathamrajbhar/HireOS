'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, InterviewPhase } from '@/components/interview/console/types';
import {
  fetchInterviewContext,
  endInterviewSession,
  InterviewContextData,
} from '@/lib/interview/interviewSessionApi';
import { requestAiTurnStream, type AiTurn, type AiTurnParams } from '@/lib/interview/aiTurnStream';
import { runAiTurn } from '@/lib/interview/aiTurn';
import { createVoiceLifecycle } from '@/lib/interview/voiceLifecycle';
import { voiceStream } from '@/lib/voiceStream';
import {
  createEliminationResult,
  evaluateCompletedInterview,
  getTurnStage,
  deriveNextInterviewPhase,
} from '@/lib/interview/interviewSessionEval';
import {
  UseInterviewSessionProps,
  ProctorTelemetryState,
} from '@/lib/interview/interviewSession.types';
import { stopAudio, unlockAudio } from '@/lib/audioManager';
import { useInterviewSpeech } from '@/lib/interview/useInterviewSpeech';

export type { Message, InterviewPhase };

export function useInterviewSession({
  role,
  interviewId,
  onComplete,
}: UseInterviewSessionProps) {
  const [stage, setStage] = useState<'check' | 'session'>('check');
  const [phase, setPhase] = useState<InterviewPhase>('Introduction');
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(900);
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiRespondError, setAiRespondError] = useState<string | null>(null);
  const [proctorTelemetry, setProctorTelemetry] = useState<ProctorTelemetryState>({
    faceCount: null,
    gazeCentered: null,
    engagementIndex: null,
  });
  const [showWarningModal, setShowWarningModal] = useState(false);

  const transcriptData = useRef<{ question: string; answer: string; feedback: string }[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const lastAiQuestion = useRef('');
  const contextDataRef = useRef<InterviewContextData>({ jobTitle: role });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (stage !== 'session') return;
    if (showWarningModal) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, showWarningModal]);

  // The agent's voice belongs to this lifecycle: closing it silences the speaker and makes every
  // reply still in flight harmless. Exit paths must call it first, before any await.
  const [lifecycle] = useState(() => createVoiceLifecycle());

  useEffect(() => {
    lifecycle.reopen(); // React StrictMode runs cleanup and then setup again
    const onPageHide = () => lifecycle.close();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      lifecycle.close();
    };
  }, [lifecycle]);

  const closeVoiceSession = useCallback(() => lifecycle.close(), [lifecycle]);

  const speakTurn = useCallback(
    (params: AiTurnParams, onReply: (turn: AiTurn) => void) =>
      runAiTurn(
        params,
        lifecycle.beginTurn().signal,
        { onTurn: onReply, onSpeaking: setIsAiSpeaking },
        { stream: requestAiTurnStream, voice: voiceStream, isAlive: lifecycle.isAlive }
      ),
    [lifecycle]
  );

  const handleComplete = useCallback(async () => {
    lifecycle.close();
    await endInterviewSession(interviewId, messagesRef.current);
    const results = evaluateCompletedInterview(role, transcriptData.current);
    onComplete(results);
  }, [lifecycle, interviewId, onComplete, role]);

  const submitAnswer = useCallback(async (text: string) => {
    if (!text.trim() || isAnalyzing || !lifecycle.isAlive()) return;

    stopAudio();
    setIsAiSpeaking(false);

    const currentTimestamp = Date.now();
    const timestamp = new Date(currentTimestamp).toLocaleTimeString();
    setMessages((prev) => [...prev, { id: `c-${currentTimestamp}`, role: 'candidate', content: text, timestamp }]);
    setIsAnalyzing(true);
    setAiRespondError(null);

    try {
      await speakTurn(
        {
          interviewId,
          transcript: text,
          turnNumber: messagesRef.current.length + 1,
          stage: getTurnStage(phase),
          jobTitle: contextDataRef.current.jobTitle,
          candidateResume: contextDataRef.current.candidateResume,
          candidateContext: contextDataRef.current.candidateContext,
          conversationHistory: messagesRef.current.map((m) => ({ speaker: m.role, text: m.content })),
        },
        (turn) => {
          transcriptData.current.push({
            question: lastAiQuestion.current || `Response for the ${role} role`,
            answer: text,
            feedback: '',
          });
          lastAiQuestion.current = turn.text;
          setPhase(deriveNextInterviewPhase(turn.stage));
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: 'ai',
              content: turn.text,
              timestamp: new Date().toLocaleTimeString(),
              analysis: turn.analysis as Message['analysis'],
              turnRecord: turn.turnRecord as Message['turnRecord'],
            },
          ]);
          setIsAnalyzing(false);
        }
      );
    } catch (err) {
      if (!lifecycle.isAlive()) return; // the candidate already left; nothing to show or retry
      setAiRespondError(err instanceof Error ? err.message : 'Network error contacting AI service.');
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: 'I could not reach the AI voice engine, so this session cannot continue. Your recorded answers will be sent for evaluation.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setIsAnalyzing(false);
      setIsAiSpeaking(false);
      setTimeout(() => lifecycle.isAlive() && handleComplete(), 1200);
    }
  }, [handleComplete, interviewId, isAnalyzing, lifecycle, phase, role, speakTurn]);

  const {
    candidateSpeechText,
    setCandidateSpeechText,
  } = useInterviewSpeech({
    active: stage === 'session',
    micActive,
    isAiSpeaking,
    isAnalyzing,
    aiSpeechText: [...messages].reverse().find((m) => m.role === 'ai')?.content,
    onFinalTranscript: submitAnswer,
    onError: (errText) => setAiRespondError(errText),
  });

  const startSession = async () => {
    unlockAudio();
    setStage('session');
    setPhase('Introduction');
    setIsAnalyzing(true);

    const fsPromise = !document.fullscreenElement
      ? document.documentElement.requestFullscreen().catch(() => undefined)
      : Promise.resolve();

    contextDataRef.current = await fetchInterviewContext(interviewId, role);
    await fsPromise;
    if (!lifecycle.isAlive()) return; // left during device checks / fullscreen: never start the agent

    try {
      const context = contextDataRef.current;
      await speakTurn(
        {
          interviewId,
          transcript: '',
          turnNumber: 0,
          stage: 'intro',
          jobTitle: context.jobTitle,
          candidateResume: context.candidateResume,
          candidateContext: context.candidateContext,
          conversationHistory: [],
        },
        (turn) => {
          lastAiQuestion.current = turn.text;
          setMessages([
            { id: 'ai-init', role: 'ai', content: turn.text, timestamp: new Date().toLocaleTimeString() },
          ]);
          setIsAnalyzing(false);
        }
      );
    } catch (err) {
      if (!lifecycle.isAlive()) return;
      setAiRespondError(err instanceof Error ? err.message : 'Network error contacting AI service.');
      setMessages([
        {
          id: 'ai-init-error',
          role: 'ai',
          content: 'I could not reach the AI voice engine to start the session. Please check your connection and try again.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setIsAnalyzing(false);
      setIsAiSpeaking(false);
    }
  };

  const handleResumeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setShowWarningModal(false);
  };

  const handleEliminateCandidate = async () => {
    lifecycle.close();
    await endInterviewSession(interviewId, messagesRef.current);
    onComplete(createEliminationResult(messagesRef.current));
  };

  return {
    stage,
    phase,
    messages,
    timeRemaining,
    micActive,
    camActive,
    isAnalyzing,
    isAiSpeaking,
    candidateSpeechText,
    setCandidateSpeechText,
    aiRespondError,
    proctorTelemetry,
    setProctorTelemetry,
    startSession,
    submitAnswer,
    wrapUp: handleComplete,
    closeVoiceSession,
    toggleMic: () => setMicActive((p) => !p),
    toggleCam: () => setCamActive((p) => !p),
    setStage,
    showWarningModal,
    onResumeFullscreen: handleResumeFullscreen,
    onEliminate: handleEliminateCandidate,
  };
}
