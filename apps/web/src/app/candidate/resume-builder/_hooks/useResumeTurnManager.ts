'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ConversationTurn,
  createResumeSession,
  fetchResumeAiTurn,
} from './resumeVoiceApi';

interface UseResumeTurnManagerProps {
  targetRole: string;
  experienceLevel: string;
  initialSessionId?: string | null;
  existingResume?: string | null;
  careerGoals?: string | null;
  onSpeakText: (text: string, audioUrl?: string, callback?: () => void) => void;
  onStopSpeech: () => void;
  onStartSpeech: () => void;
  onFinalize: (sessionId: string, history: ConversationTurn[]) => void;
  setAiState: (state: 'speaking' | 'listening' | 'evaluating') => void;
  setError: (err: string | null) => void;
}

export function useResumeTurnManager({
  targetRole,
  experienceLevel,
  initialSessionId = null,
  existingResume = null,
  careerGoals = null,
  onSpeakText,
  onStopSpeech,
  onStartSpeech,
  onFinalize,
  setAiState,
  setError,
}: UseResumeTurnManagerProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [turnIndex, setTurnIndex] = useState(0);
  const [stage, setStage] = useState<string>('intro');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [realtimeInsight, setRealtimeInsight] = useState<string | null>(null);
  const [memory, setMemory] = useState<Record<string, unknown>>({});
  const [profileType, setProfileType] = useState<string | null>(null);

  const conversationHistoryRef = useRef<ConversationTurn[]>([]);
  const memoryRef = useRef<Record<string, unknown>>({});
  const profileTypeRef = useRef<string | null>(null);
  const isCallActiveRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  useEffect(() => {
    profileTypeRef.current = profileType;
  }, [profileType]);

  const abortCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isCallActiveRef.current = false;
      abortCurrentRequest();
    };
  }, [abortCurrentRequest]);

  const getAIResponse = useCallback(
    async (
      candidateResponse: string,
      currentSessionId: string,
      currentTurnIndex: number,
      currentStage: string
    ) => {
      if (!isCallActiveRef.current) return;

      abortCurrentRequest();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setAiState('evaluating');
      onStopSpeech();

      const newHistory = [...conversationHistoryRef.current];
      if (candidateResponse.trim()) {
        newHistory.push({
          role: 'candidate',
          content: candidateResponse,
          timestamp: new Date().toLocaleTimeString(),
        });
        setConversationHistory(newHistory);
      }

      try {
        const data = await fetchResumeAiTurn(
          {
            sessionId: currentSessionId,
            transcript: candidateResponse,
            targetRole,
            targetCompany: 'Target Enterprise',
            stage: currentStage,
            turnNumber: currentTurnIndex,
            conversationHistory: newHistory.map((h) => ({
              speaker: h.role,
              text: h.content,
            })),
            memory: memoryRef.current,
            existingResume,
            careerGoals,
            profileType: profileTypeRef.current,
          },
          abortController.signal
        );

        if (!isCallActiveRef.current) return;

        if (data.memory) {
          setMemory(data.memory);
          const inferredType = (data.memory as Record<string, unknown>).profile_type as string | null;
          if (inferredType && inferredType !== profileTypeRef.current) {
            setProfileType(inferredType);
          }
        }

        const updatedHistory = [
          ...newHistory,
          { role: 'ai' as const, content: data.text, timestamp: new Date().toLocaleTimeString() },
        ];
        setConversationHistory(updatedHistory);
        setTurnIndex(data.turnNumber);
        setStage(data.stage);
        if (data.realtimeInsight) setRealtimeInsight(data.realtimeInsight);

        if (data.isComplete) {
          setAiState('speaking');
          onSpeakText(data.text, data.audioUrl, () => {
            if (isCallActiveRef.current) {
              onFinalize(currentSessionId, updatedHistory);
            }
          });
        } else {
          onSpeakText(data.text, data.audioUrl, () => {
            if (isCallActiveRef.current) {
              setAiState('listening');
              onStartSpeech();
            }
          });
        }
      } catch (err: unknown) {
        if (!isCallActiveRef.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;

        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message || 'Error communicating with AI voice agent.');
        setAiState('listening');
        onStartSpeech();
      }
    },
    [
      targetRole,
      existingResume,
      careerGoals,
      abortCurrentRequest,
      onSpeakText,
      onStopSpeech,
      onStartSpeech,
      onFinalize,
      setAiState,
      setError,
    ]
  );

  const startCall = useCallback(async () => {
    isCallActiveRef.current = true;
    setError(null);
    setConversationHistory([]);
    setTurnIndex(0);
    setStage('intro');
    setAiState('speaking');
    setMemory({});
    setProfileType(null);
    memoryRef.current = {};
    profileTypeRef.current = null;

    try {
      let activeSessionId = initialSessionId;
      if (!activeSessionId) {
        activeSessionId = await createResumeSession(targetRole, experienceLevel);
        setSessionId(activeSessionId);
      }
      if (!isCallActiveRef.current) return;
      await getAIResponse('', activeSessionId, 0, 'intro');
    } catch (err: unknown) {
      if (!isCallActiveRef.current) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message || 'Failed to start resume builder session.');
    }
  }, [targetRole, experienceLevel, initialSessionId, getAIResponse, setAiState, setError]);

  const resetAll = useCallback(() => {
    isCallActiveRef.current = false;
    abortCurrentRequest();
    setSessionId(null);
    setTurnIndex(0);
    setStage('intro');
    setConversationHistory([]);
    setRealtimeInsight(null);
    setError(null);
    setMemory({});
    setProfileType(null);
    conversationHistoryRef.current = [];
    memoryRef.current = {};
    profileTypeRef.current = null;
  }, [abortCurrentRequest, setError]);

  return {
    sessionId,
    turnIndex,
    stage,
    conversationHistory,
    conversationHistoryRef,
    realtimeInsight,
    memory,
    profileType,
    getAIResponse,
    startCall,
    resetAll,
    abortCurrentRequest,
    isCallActive: () => isCallActiveRef.current,
  };
}
