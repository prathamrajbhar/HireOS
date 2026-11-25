'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { interruptAudio } from '@/lib/audioManager';
import { browserMicDeps } from './stt/browserDeps';
import { MicCapture, type CapturedUtterance } from './stt/micCapture';
import { micErrorMessage } from './stt/sttErrors';
import { transcribeUtterance } from './stt/sttApi';
import { processUtterance } from './stt/utteranceProcessor';
import { useReportOnce } from './useReportOnce';

export type SpeechStatus = 'off' | 'listening' | 'transcribing';

interface UseInterviewSpeechProps {
  /** The interview session has started (the mic stays closed on the device-check screen). */
  active: boolean;
  micActive: boolean;
  isAiSpeaking: boolean;
  isAnalyzing: boolean;
  /** What the AI is currently saying; used to ignore the mic hearing the AI through the speakers. */
  aiSpeechText?: string;
  onFinalTranscript: (text: string) => void;
  onError?: (msg: string) => void;
}

/**
 * Candidate voice input: records each spoken answer in the browser and transcribes it with the
 * server's Whisper endpoint, then submits the text as the candidate's turn.
 */
export function useInterviewSpeech({
  active,
  micActive,
  isAiSpeaking,
  isAnalyzing,
  aiSpeechText = '',
  onFinalTranscript,
  onError,
}: UseInterviewSpeechProps) {
  const [candidateSpeechText, setCandidateSpeechText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const captureRef = useRef<MicCapture | null>(null);
  const busyRef = useRef(false);
  const reportOnce = useReportOnce(onError);

  const latest = useRef({ aiSpeechText, onFinalTranscript, reportOnce });
  useEffect(() => {
    latest.current = { aiSpeechText, onFinalTranscript, reportOnce };
  }, [aiSpeechText, onFinalTranscript, reportOnce]);

  const handleUtterance = useCallback(async (utterance: CapturedUtterance) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setTranscribing(true);
    try {
      await processUtterance(utterance, {
        transcribe: transcribeUtterance,
        getAiText: () => latest.current.aiSpeechText,
        onFinal: (text) => {
          setCandidateSpeechText(text);
          latest.current.onFinalTranscript(text);
        },
        onError: (message) => latest.current.reportOnce(message),
      });
    } finally {
      busyRef.current = false;
      setTranscribing(false);
    }
  }, []);

  const micOpen = active && micActive;

  useEffect(() => {
    if (!micOpen) return;
    const capture = new MicCapture(browserMicDeps, {
      onUtterance: (u) => void handleUtterance(u),
      onBargeIn: () => interruptAudio(), // resets "AI is speaking" so the answer can be submitted
      onError: (code) => latest.current.reportOnce(micErrorMessage(code)),
    });
    captureRef.current = capture;
    void capture.start();
    return () => {
      capture.stop();
      captureRef.current = null;
    };
  }, [micOpen, handleUtterance]);

  const listening = micOpen && !isAnalyzing && !transcribing;
  useEffect(() => {
    captureRef.current?.setListening(listening);
  }, [listening, micOpen]);

  useEffect(() => {
    captureRef.current?.setAiSpeaking(isAiSpeaking);
  }, [isAiSpeaking, micOpen]);

  const speechStatus: SpeechStatus = !micOpen ? 'off' : transcribing ? 'transcribing' : 'listening';

  return { candidateSpeechText, setCandidateSpeechText, speechStatus };
}
