'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  SpeechRecognitionClass,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionInstance,
} from './speechRecognition.types';

interface UseResumeSpeechProps {
  micActive: boolean;
  aiState: 'speaking' | 'listening' | 'evaluating';
  onFinalTranscript: (text: string) => void;
  onError: (msg: string) => void;
}

export function useResumeSpeech({
  micActive,
  aiState,
  onFinalTranscript,
  onError,
}: UseResumeSpeechProps) {
  const [candidateSpeechText, setCandidateSpeechText] = useState('');
  const candidateSpeechTextRef = useRef('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionActiveRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  const aiStateRef = useRef(aiState);
  const micActiveRef = useRef(micActive);

  useEffect(() => {
    candidateSpeechTextRef.current = candidateSpeechText;
  }, [candidateSpeechText]);

  useEffect(() => {
    aiStateRef.current = aiState;
  }, [aiState]);

  useEffect(() => {
    micActiveRef.current = micActive;
  }, [micActive]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    clearSilenceTimer();
    recognitionActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, [clearSilenceTimer]);

  const submitCurrentSpeech = useCallback(() => {
    clearSilenceTimer();
    const text = candidateSpeechTextRef.current.trim();
    if (!text || isSubmittingRef.current || aiStateRef.current !== 'listening') return;

    isSubmittingRef.current = true;
    stopSpeechRecognition();
    onFinalTranscript(text);
  }, [clearSilenceTimer, stopSpeechRecognition, onFinalTranscript]);

  const startSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionClass || !micActiveRef.current) return;
    if (aiStateRef.current !== 'listening') return;
    if (recognitionActiveRef.current) return;

    clearSilenceTimer();
    isSubmittingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognitionActiveRef.current = true;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setCandidateSpeechText('');
        candidateSpeechTextRef.current = '';
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (aiStateRef.current !== 'listening') return;

        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          setCandidateSpeechText(trimmed);
          candidateSpeechTextRef.current = trimmed;
        }

        clearSilenceTimer();

        // 1.8s of silence after speech triggers automatic submission
        if (trimmed.length >= 3 && aiStateRef.current === 'listening') {
          silenceTimerRef.current = setTimeout(() => {
            if (aiStateRef.current === 'listening' && !isSubmittingRef.current) {
              isSubmittingRef.current = true;
              stopSpeechRecognition();
              onFinalTranscript(trimmed);
            }
          }, 1800);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (
          event.error === 'aborted' ||
          event.error === 'no-speech' ||
          event.error === 'network'
        ) {
          return;
        }
        if (event.error === 'not-allowed') {
          onError('Microphone permission denied. Please allow microphone access or use the Messages drawer to chat.');
        }
      };

      recognition.onend = () => {
        recognitionActiveRef.current = false;
        recognitionRef.current = null;
        clearSilenceTimer();

        // If listening and user finished speaking, submit
        if (aiStateRef.current === 'listening' && !isSubmittingRef.current && micActiveRef.current) {
          const spokenText = candidateSpeechTextRef.current.trim();
          if (spokenText.length >= 3) {
            isSubmittingRef.current = true;
            stopSpeechRecognition();
            onFinalTranscript(spokenText);
          } else {
            // Re-instantiate fresh SpeechRecognition so microphone stays actively listening
            setTimeout(() => {
              if (aiStateRef.current === 'listening' && micActiveRef.current && !recognitionActiveRef.current) {
                startSpeechRecognition();
              }
            }, 100);
          }
        }
      };

      recognition.start();
    } catch {
      recognitionActiveRef.current = false;
      recognitionRef.current = null;
    }
  }, [clearSilenceTimer, stopSpeechRecognition, onFinalTranscript, onError]);

  // Reactive state management: automatically engage speech recognition whenever AI enters 'listening'
  useEffect(() => {
    if (aiState === 'listening' && micActive) {
      const timer = setTimeout(() => {
        startSpeechRecognition();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      stopSpeechRecognition();
    }
  }, [aiState, micActive, startSpeechRecognition, stopSpeechRecognition]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();
      stopSpeechRecognition();
    };
  }, [clearSilenceTimer, stopSpeechRecognition]);

  return {
    candidateSpeechText,
    setCandidateSpeechText,
    startSpeechRecognition,
    stopSpeechRecognition,
    submitCurrentSpeech,
    isRecognitionActive: () => recognitionActiveRef.current,
  };
}
