'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  playAudio,
  stopAudio,
  unlockAudio,
  replayLastAudio as replayAudioManager,
} from '@/lib/audioManager';
import { useResumeSpeech } from './useResumeSpeech';
import { useResumeTurnManager } from './useResumeTurnManager';
import { ConversationTurn, finalizeResumeSession } from './resumeVoiceApi';

export type { ConversationTurn };

interface UseResumeVoiceSessionProps {
  targetRole: string;
  experienceLevel: string;
  initialSessionId?: string | null;
  existingResume?: string | null;
  careerGoals?: string | null;
  onComplete: (sessionId: string, transcript: ConversationTurn[]) => void;
}

export function useResumeVoiceSession({
  targetRole,
  experienceLevel,
  initialSessionId = null,
  existingResume = null,
  careerGoals = null,
  onComplete,
}: UseResumeVoiceSessionProps) {
  const [aiState, setAiState] = useState<'speaking' | 'listening' | 'evaluating'>('speaking');
  const [micActive, setMicActive] = useState(true);
  const [camActive, setCamActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const aiStateRef = useRef<'speaking' | 'listening' | 'evaluating'>('speaking');
  const isCallActiveRef = useRef(true);
  const submitResponseRef = useRef<((text: string) => Promise<void>) | null>(null);
  const finalizeExtrasRef = useRef<{
    memory: Record<string, unknown>;
    profileType: string | null;
  }>({ memory: {}, profileType: null });

  const updateAiState = useCallback((newState: 'speaking' | 'listening' | 'evaluating') => {
    aiStateRef.current = newState;
    setAiState(newState);
  }, []);

  useEffect(() => {
    aiStateRef.current = aiState;
  }, [aiState]);

  useEffect(() => {
    isCallActiveRef.current = true;
    return () => {
      isCallActiveRef.current = false;
      stopAudio();
    };
  }, []);

  const speech = useResumeSpeech({
    micActive,
    aiState,
    onFinalTranscript: (text) => {
      if (submitResponseRef.current) {
        void submitResponseRef.current(text);
      }
    },
    onError: (msg) => setError(msg),
  });

  const speakText = useCallback(
    (text: string, audioUrl?: string, callback?: () => void) => {
      if (!isCallActiveRef.current) return;

      updateAiState('speaking');
      speech.stopSpeechRecognition();

      playAudio(text, audioUrl, () => {
        if (!isCallActiveRef.current) return;
        if (callback) {
          callback();
        }
      });
    },
    [speech, updateAiState]
  );

  const handleFinalize = useCallback(
    async (activeSessionId: string, finalHistory: ConversationTurn[]) => {
      speech.stopSpeechRecognition();
      await finalizeResumeSession(activeSessionId, finalHistory, {
        memory: finalizeExtrasRef.current.memory,
        profileType: finalizeExtrasRef.current.profileType,
        existingResume,
        careerGoals,
      });
      onComplete(activeSessionId, finalHistory);
    },
    [speech, existingResume, careerGoals, onComplete]
  );

  const turns = useResumeTurnManager({
    targetRole,
    experienceLevel,
    initialSessionId,
    existingResume,
    careerGoals,
    onSpeakText: speakText,
    onStopSpeech: speech.stopSpeechRecognition,
    onStartSpeech: speech.startSpeechRecognition,
    onFinalize: handleFinalize,
    setAiState: updateAiState,
    setError,
  });

  // Keep finalize extras ref in sync so handleFinalize always reads latest values
  useEffect(() => {
    finalizeExtrasRef.current = {
      memory: turns.memory,
      profileType: turns.profileType,
    };
  }, [turns.memory, turns.profileType]);

  const replayLastAudio = useCallback(() => {
    if (!isCallActiveRef.current) return;
    updateAiState('speaking');
    speech.stopSpeechRecognition();
    replayAudioManager(() => {
      if (!isCallActiveRef.current) return;
      updateAiState('listening');
    });
  }, [speech, updateAiState]);

  const startCall = useCallback(async () => {
    isCallActiveRef.current = true;
    unlockAudio();
    await turns.startCall();
  }, [turns]);

  const submitResponse = useCallback(
    async (text: string) => {
      if (!isCallActiveRef.current) return;
      if (aiStateRef.current === 'evaluating' || !turns.sessionId) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      stopAudio();
      updateAiState('evaluating');
      speech.stopSpeechRecognition();
      speech.setCandidateSpeechText('');
      await turns.getAIResponse(trimmed, turns.sessionId, turns.turnIndex, turns.stage);
    },
    [turns, speech, updateAiState]
  );

  useEffect(() => {
    submitResponseRef.current = submitResponse;
  }, [submitResponse]);

  const submitVoiceResponse = useCallback(() => {
    speech.submitCurrentSpeech();
  }, [speech]);

  const endCall = useCallback(async () => {
    isCallActiveRef.current = false;
    stopAudio();
    speech.stopSpeechRecognition();
    turns.abortCurrentRequest();
    if (turns.sessionId) {
      await handleFinalize(turns.sessionId, turns.conversationHistoryRef.current);
    }
  }, [turns, speech, handleFinalize]);

  const handleToggleMic = useCallback(() => {
    setMicActive((prev) => {
      const next = !prev;
      if (!next) {
        speech.stopSpeechRecognition();
      } else if (aiStateRef.current === 'listening') {
        setTimeout(speech.startSpeechRecognition, 100);
      }
      return next;
    });
  }, [speech]);

  const abortCall = useCallback(() => {
    isCallActiveRef.current = false;
    stopAudio();
    speech.stopSpeechRecognition();
    updateAiState('speaking');
    speech.setCandidateSpeechText('');
    turns.resetAll();
  }, [speech, turns, updateAiState]);

  return {
    sessionId: turns.sessionId,
    stage: turns.stage,
    turnIndex: turns.turnIndex,
    conversationHistory: turns.conversationHistory,
    aiState,
    candidateSpeechText: speech.candidateSpeechText,
    realtimeInsight: turns.realtimeInsight,
    micActive,
    camActive,
    setCamActive,
    toggleMic: handleToggleMic,
    error,
    startCall,
    submitResponse,
    submitVoiceResponse,
    replayLastAudio,
    endCall,
    abortCall,
  };
}
