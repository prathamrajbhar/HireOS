'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  SpeechRecognitionClass,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionInstance,
  MicState,
} from './speechRecognition.types';

export type { MicState };

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
  const [micState, setMicState] = useState<MicState>('idle');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  const candidateSpeechTextRef = useRef('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recognitionActiveRef = useRef(false);
  const isExplicitlyStoppedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isPermissionDeniedRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const networkRetryCountRef = useRef(0);

  // Buffer holding text finalized across consecutive recognition segments within the current turn
  const turnCommittedTextRef = useRef('');
  const currentInstanceFinalRef = useRef('');
  const currentInstanceInterimRef = useRef('');

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const aiStateRef = useRef(aiState);
  const micActiveRef = useRef(micActive);
  const startSpeechRecognitionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    candidateSpeechTextRef.current = candidateSpeechText;
  }, [candidateSpeechText]);

  useEffect(() => {
    aiStateRef.current = aiState;
  }, [aiState]);

  useEffect(() => {
    micActiveRef.current = micActive;
  }, [micActive]);

  const clearSilenceTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(null);
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    clearSilenceTimers();
    recognitionActiveRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, [clearSilenceTimers]);

  const clearCandidateSpeech = useCallback(() => {
    clearSilenceTimers();
    turnCommittedTextRef.current = '';
    currentInstanceFinalRef.current = '';
    currentInstanceInterimRef.current = '';
    candidateSpeechTextRef.current = '';
    isUserEditingRef.current = false;
    setCandidateSpeechText('');

    if (aiStateRef.current === 'listening' && micActiveRef.current && !isPermissionDeniedRef.current) {
      setMicState('listening');
      if (!recognitionActiveRef.current) {
        startSpeechRecognitionRef.current?.();
      }
    } else {
      setMicState('idle');
    }
  }, [clearSilenceTimers]);

  const submitCurrentSpeech = useCallback(
    (overrideText?: string) => {
      clearSilenceTimers();
      const textToSubmit = (overrideText !== undefined ? overrideText : candidateSpeechTextRef.current).trim();
      if (!textToSubmit || isSubmittingRef.current || aiStateRef.current !== 'listening') {
        return;
      }

      isSubmittingRef.current = true;
      setMicState('submitting');
      stopSpeechRecognition();

      // Reset turn accumulation buffers
      turnCommittedTextRef.current = '';
      currentInstanceFinalRef.current = '';
      currentInstanceInterimRef.current = '';
      isUserEditingRef.current = false;

      onFinalTranscript(textToSubmit);
    },
    [clearSilenceTimers, stopSpeechRecognition, onFinalTranscript]
  );

  const handleManualTextChange = useCallback(
    (newText: string) => {
      isUserEditingRef.current = true;
      clearSilenceTimers();
      setCandidateSpeechText(newText);
      candidateSpeechTextRef.current = newText;
      turnCommittedTextRef.current = newText;
      currentInstanceFinalRef.current = '';
      currentInstanceInterimRef.current = '';

      if (newText.trim().length > 0) {
        setMicState('transcript_ready');
      } else if (aiStateRef.current === 'listening' && micActiveRef.current) {
        setMicState('listening');
      }
    },
    [clearSilenceTimers]
  );

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    setMicState('requesting_permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      isPermissionDeniedRef.current = false;
      setMicErrorMessage(null);
      if (aiStateRef.current === 'listening' && micActiveRef.current) {
        setMicState('listening');
        startSpeechRecognitionRef.current?.();
      } else {
        setMicState('idle');
      }
      return true;
    } catch {
      isPermissionDeniedRef.current = true;
      setMicState('error');
      const err = 'Microphone permission denied. Please allow microphone access in your browser.';
      setMicErrorMessage(err);
      onError(err);
      return false;
    }
  }, [onError]);

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!SpeechRecognitionClass) {
      setMicState('error');
      const msg = 'Speech recognition is not supported in this browser. Please use Google Chrome or Edge, or use the Messages drawer to chat.';
      setMicErrorMessage(msg);
      onError(msg);
      return;
    }

    if (!micActiveRef.current || aiStateRef.current !== 'listening' || isPermissionDeniedRef.current) {
      return;
    }

    if (recognitionActiveRef.current) {
      return;
    }

    isExplicitlyStoppedRef.current = false;
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
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        recognitionActiveRef.current = true;
        currentInstanceFinalRef.current = '';
        currentInstanceInterimRef.current = '';

        if (candidateSpeechTextRef.current.trim().length > 0) {
          setMicState('transcript_ready');
        } else {
          setMicState('listening');
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (aiStateRef.current !== 'listening' || isSubmittingRef.current) {
          return;
        }

        let instanceFinal = '';
        let instanceInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item && item[0]) {
            const transcript = item[0].transcript;
            if (item.isFinal) {
              instanceFinal += transcript + ' ';
            } else {
              instanceInterim += transcript;
            }
          }
        }

        currentInstanceFinalRef.current = instanceFinal.trim();
        currentInstanceInterimRef.current = instanceInterim.trim();

        // Combine committed past segments with current session's final and interim speech
        const combined = [
          turnCommittedTextRef.current,
          currentInstanceFinalRef.current,
          currentInstanceInterimRef.current,
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (combined && !isUserEditingRef.current) {
          setCandidateSpeechText(combined);
          candidateSpeechTextRef.current = combined;
          setMicState('processing_speech');
        }

        clearSilenceTimers();

        // 4.5s natural pause triggers transcript ready with a gentle countdown
        if (combined.length >= 3 && aiStateRef.current === 'listening' && !isUserEditingRef.current) {
          let count = 4;
          setSilenceCountdown(count);

          countdownIntervalRef.current = setInterval(() => {
            count -= 1;
            if (count > 0) {
              setSilenceCountdown(count);
            } else {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              setSilenceCountdown(null);
            }
          }, 1000);

          silenceTimerRef.current = setTimeout(() => {
            if (
              aiStateRef.current === 'listening' &&
              !isSubmittingRef.current &&
              !isUserEditingRef.current &&
              candidateSpeechTextRef.current.trim().length >= 3
            ) {
              submitCurrentSpeech();
            } else {
              setMicState('transcript_ready');
            }
          }, 4500);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted') {
          return;
        }

        if (event.error === 'no-speech') {
          // Candidate hasn't started speaking or paused
          if (candidateSpeechTextRef.current.trim().length > 0) {
            setMicState('transcript_ready');
          } else {
            setMicState('listening');
          }
          return;
        }

        if (event.error === 'network') {
          // If transcript already exists, preserve it for the candidate
          if (candidateSpeechTextRef.current.trim().length > 0) {
            setMicState('transcript_ready');
          } else if (networkRetryCountRef.current < 2) {
            networkRetryCountRef.current += 1;
            setTimeout(() => {
              if (aiStateRef.current === 'listening' && micActiveRef.current && !recognitionActiveRef.current) {
                startSpeechRecognitionRef.current?.();
              }
            }, 1500);
          } else {
            setMicState('error');
            const err = 'Speech recognition network timeout. You can still type in the Chat drawer.';
            setMicErrorMessage(err);
            onError(err);
          }
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isPermissionDeniedRef.current = true;
          recognitionActiveRef.current = false;
          setMicState('error');
          const err = 'Microphone permission denied. Please allow microphone access or use the Messages drawer to chat.';
          setMicErrorMessage(err);
          onError(err);
          return;
        }

        if (event.error === 'audio-capture') {
          recognitionActiveRef.current = false;
          setMicState('error');
          const err = 'Microphone hardware unavailable or in use by another app.';
          setMicErrorMessage(err);
          onError(err);
          return;
        }
      };

      recognition.onend = () => {
        recognitionActiveRef.current = false;
        recognitionRef.current = null;

        // Commit current instance's final text into turn buffer so restarts don't lose speech
        const newlyFinalized = currentInstanceFinalRef.current;
        if (newlyFinalized) {
          turnCommittedTextRef.current = [turnCommittedTextRef.current, newlyFinalized]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          currentInstanceFinalRef.current = '';
          currentInstanceInterimRef.current = '';
        }

        if (
          isExplicitlyStoppedRef.current ||
          isSubmittingRef.current ||
          isPermissionDeniedRef.current ||
          aiStateRef.current !== 'listening' ||
          !micActiveRef.current
        ) {
          if (candidateSpeechTextRef.current.trim().length > 0 && !isSubmittingRef.current) {
            setMicState('transcript_ready');
          } else if (!isSubmittingRef.current && micState !== 'error') {
            setMicState('idle');
          }
          return;
        }

        // Keep microphone listening without wiping text
        setTimeout(() => {
          if (
            aiStateRef.current === 'listening' &&
            micActiveRef.current &&
            !recognitionActiveRef.current &&
            !isPermissionDeniedRef.current &&
            !isExplicitlyStoppedRef.current
          ) {
            startSpeechRecognitionRef.current?.();
          }
        }, 100);
      };

      recognition.start();
    } catch {
      recognitionActiveRef.current = false;
      recognitionRef.current = null;
      if (candidateSpeechTextRef.current.trim().length > 0) {
        setMicState('transcript_ready');
      }
    }
  }, [clearSilenceTimers, submitCurrentSpeech, onError, micState]);

  useEffect(() => {
    startSpeechRecognitionRef.current = startSpeechRecognition;
  }, [startSpeechRecognition]);

  // Synchronize mic state with aiState and micActive transitions
  useEffect(() => {
    if (aiState === 'evaluating') {
      setMicState('submitting');
      stopSpeechRecognition();
    } else if (aiState === 'speaking') {
      setMicState('idle');
      stopSpeechRecognition();
    } else if (aiState === 'listening') {
      if (!micActive) {
        setMicState('idle');
        stopSpeechRecognition();
      } else if (!isPermissionDeniedRef.current) {
        const timer = setTimeout(() => {
          startSpeechRecognition();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [aiState, micActive, startSpeechRecognition, stopSpeechRecognition]);

  useEffect(() => {
    return () => {
      clearSilenceTimers();
      stopSpeechRecognition();
    };
  }, [clearSilenceTimers, stopSpeechRecognition]);

  return {
    candidateSpeechText,
    setCandidateSpeechText: handleManualTextChange,
    clearCandidateSpeech,
    micState,
    micErrorMessage,
    silenceCountdown,
    requestMicPermission,
    startSpeechRecognition,
    stopSpeechRecognition,
    submitCurrentSpeech,
    isRecognitionActive: () => recognitionActiveRef.current,
  };
}
