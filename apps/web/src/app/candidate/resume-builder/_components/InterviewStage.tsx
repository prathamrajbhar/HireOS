'use client';

import React, { useState } from 'react';
import { MicState } from '../_hooks/speechRecognition.types';
import { InterviewHeader } from './InterviewHeader';
import { InterviewAiPanel } from './InterviewAiPanel';
import { InterviewUserPanel } from './InterviewUserPanel';
import { InterviewChatDrawer } from './InterviewChatDrawer';
import { InterviewControlBar } from './InterviewControlBar';

interface ConversationTurn {
  role: 'candidate' | 'ai';
  content: string;
  timestamp: string;
}

interface InterviewStageProps {
  targetRole: string;
  experienceLevel: string;
  timeRemaining: number;
  formatTimer: (sec: number) => string;
  aiState: 'speaking' | 'listening' | 'evaluating';
  currentTurn: { aiMessage: string };
  conversationHistory?: ConversationTurn[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  camActive: boolean;
  setCamActive: (val: boolean) => void;
  micActive: boolean;
  setMicActive: (val: boolean) => void;
  micLevel?: number;
  candidateSpeechText: string;
  setCandidateSpeechText?: (text: string) => void;
  clearCandidateSpeech?: () => void;
  micState?: MicState;
  silenceCountdown?: number | null;
  requestMicPermission?: () => Promise<boolean>;
  micErrorMessage?: string | null;
  realtimeInsight?: string | null;
  voiceError?: string | null;
  audioNotice?: string | null;
  onRetryTurn?: () => void;
  failedInput?: string | null;
  onReplayAudio?: () => void;
  onSubmitResponse?: (text: string) => void;
  onEndCall: () => void;
  onCancelCall?: () => void;
}

export function InterviewStage({
  targetRole,
  experienceLevel,
  timeRemaining,
  formatTimer,
  aiState,
  currentTurn,
  conversationHistory = [],
  videoRef,
  camActive,
  setCamActive,
  micActive,
  setMicActive,
  micLevel = 0,
  candidateSpeechText,
  setCandidateSpeechText,
  clearCandidateSpeech,
  micState = 'idle',
  silenceCountdown = null,
  requestMicPermission,
  micErrorMessage,
  realtimeInsight,
  voiceError,
  audioNotice,
  onRetryTurn,
  failedInput,
  onReplayAudio,
  onSubmitResponse,
  onEndCall,
  onCancelCall,
}: InterviewStageProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const lastCandidateTurn = [...conversationHistory]
    .reverse()
    .find((t) => t.role === 'candidate');

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] rounded-3xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl flex flex-col justify-between p-6 font-sans">
      {voiceError && (
        <div className="absolute top-16 left-6 right-6 z-50 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-between gap-3 text-xs font-semibold text-rose-300 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
            <span>⚠️ {voiceError}</span>
          </div>
          {onRetryTurn && (
            <button
              type="button"
              onClick={onRetryTurn}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow active:scale-95 flex-shrink-0"
            >
              Retry Turn
            </button>
          )}
        </div>
      )}

      {!voiceError && audioNotice && (
        <div className="absolute top-16 left-6 right-6 z-40 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 text-[11px] font-semibold text-amber-300 backdrop-blur-xl shadow">
          <span>🔊 {audioNotice}</span>
        </div>
      )}

      <InterviewHeader
        targetRole={targetRole}
        experienceLevel={experienceLevel}
        timeRemaining={timeRemaining}
        formatTimer={formatTimer}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onCancelCall={onCancelCall}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-4 flex-1 min-h-0">
        <InterviewAiPanel
          aiState={aiState}
          currentTurn={currentTurn}
          realtimeInsight={realtimeInsight}
          onReplayAudio={onReplayAudio}
          isChatOpen={isChatOpen}
        />

        <InterviewUserPanel
          micActive={micActive}
          camActive={camActive}
          videoRef={videoRef}
          candidateSpeechText={candidateSpeechText}
          setCandidateSpeechText={setCandidateSpeechText}
          clearCandidateSpeech={clearCandidateSpeech}
          lastCandidateTurnContent={lastCandidateTurn?.content}
          isChatOpen={isChatOpen}
          aiState={aiState}
          micState={micState}
          micLevel={micLevel}
          silenceCountdown={silenceCountdown}
          requestMicPermission={requestMicPermission}
          micErrorMessage={micErrorMessage}
          onSubmitResponse={onSubmitResponse}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
        />

        {isChatOpen && (
          <InterviewChatDrawer
            conversationHistory={conversationHistory}
            aiState={aiState}
            candidateSpeechText={candidateSpeechText}
            onClose={() => setIsChatOpen(false)}
            onSubmitResponse={onSubmitResponse}
            failedInput={failedInput}
          />
        )}
      </div>

      <InterviewControlBar
        micActive={micActive}
        onToggleMic={() => setMicActive(!micActive)}
        camActive={camActive}
        onToggleCam={() => setCamActive(!camActive)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onCancelCall={onCancelCall}
        onEndCall={onEndCall}
      />
    </div>
  );
}
