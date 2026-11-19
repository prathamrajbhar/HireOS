'use client';

import React, { useRef, useEffect } from 'react';
import {
  User,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  AlertCircle,
  Check,
  MessageSquare,
} from '@/lib/lucide-google-icons';
import { MicState } from '../_hooks/speechRecognition.types';

interface InterviewUserPanelProps {
  micActive: boolean;
  camActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  candidateSpeechText: string;
  setCandidateSpeechText?: (text: string) => void;
  clearCandidateSpeech?: () => void;
  lastCandidateTurnContent?: string;
  isChatOpen: boolean;
  aiState?: 'speaking' | 'listening' | 'evaluating';
  micState?: MicState;
  micLevel?: number;
  silenceCountdown?: number | null;
  requestMicPermission?: () => Promise<boolean>;
  micErrorMessage?: string | null;
  onSubmitResponse?: (text: string) => void;
  onToggleChat?: () => void;
}

export function InterviewUserPanel({
  micActive,
  camActive,
  videoRef,
  candidateSpeechText,
  setCandidateSpeechText,
  clearCandidateSpeech,
  lastCandidateTurnContent,
  isChatOpen,
  aiState = 'listening',
  micState = 'idle',
  micLevel = 0,
  silenceCountdown = null,
  requestMicPermission,
  micErrorMessage,
  onSubmitResponse,
  onToggleChat,
}: InterviewUserPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit text content smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [candidateSpeechText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      const trimmed = candidateSpeechText.trim();
      if (trimmed && onSubmitResponse && aiState === 'listening') {
        onSubmitResponse(trimmed);
      }
    }
  };

  const renderMicStatusBadge = () => {
    if (!micActive) {
      return (
        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-slate-400">
          <MicOff className="h-3 w-3 text-slate-400" />
          <span>Idle</span>
        </div>
      );
    }

    switch (micState) {
      case 'requesting_permission':
        return (
          <div className="flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 text-[10px] font-bold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Requesting permission</span>
          </div>
        );
      case 'listening':
        return (
          <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30 text-[10px] font-bold text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <Mic className="h-3 w-3 text-cyan-400 animate-pulse" />
            <span>Listening</span>
          </div>
        );
      case 'processing_speech':
        return (
          <div className="flex items-center gap-1.5 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Mic className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span>Processing speech</span>
          </div>
        );
      case 'transcript_ready':
        return (
          <div className="flex items-center gap-1.5 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
            <Check className="h-3 w-3 text-emerald-400" />
            <span>Transcript ready</span>
          </div>
        );
      case 'submitting':
        return (
          <div className="flex items-center gap-1.5 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30 text-[10px] font-bold text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Submission in progress</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30 text-[10px] font-bold text-rose-400">
            <AlertCircle className="h-3 w-3 text-rose-400" />
            <span>Error</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-slate-400">
            <Mic className="h-3 w-3 text-slate-400" />
            <span>Idle</span>
          </div>
        );
    }
  };

  const hasCandidateSpeech = candidateSpeechText.trim().length > 0;

  return (
    <div
      className={`${
        isChatOpen ? 'lg:col-span-4' : 'lg:col-span-6'
      } rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300`}
    >
      {/* Header bar with camera status & accurate mic state */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/70 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur-md">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              camActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          Candidate Camera Feed
        </div>

        {renderMicStatusBadge()}
      </div>

      {/* Camera Video Area */}
      <div className="flex-1 flex items-center justify-center my-3 relative min-h-[220px]">
        {camActive ? (
          <div className="relative w-full h-full overflow-hidden rounded-2xl bg-slate-950/90 border border-white/10 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover transform -scale-x-100"
            />
            {/* Live audio level indicator when microphone is actively capturing voice */}
            {micActive && (micState === 'listening' || micState === 'processing_speech') && (
              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[9px] font-semibold text-slate-300">
                <Mic className="h-3 w-3 text-cyan-400 animate-pulse" />
                <div className="flex gap-0.5 items-end h-3">
                  {[20, 40, 60, 80].map((threshold, idx) => (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        micLevel >= threshold
                          ? idx > 2
                            ? 'bg-rose-400 h-3'
                            : 'bg-emerald-400 h-2.5'
                          : 'bg-slate-700 h-1'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-20 w-20 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md flex items-center justify-center text-slate-400 shadow-md">
              <User className="h-9 w-9" />
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-4 block">Camera Off</span>
          </div>
        )}
      </div>

      {/* Candidate Spoken Response & Review Area */}
      <div className="p-4 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 space-y-2 relative shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Mic className="h-3 w-3" /> Candidate Spoken Response
          </span>

          {hasCandidateSpeech && aiState === 'listening' && (
            <span className="text-[10px] font-medium text-slate-400">
              Click text to edit before sending
            </span>
          )}
        </div>

        {/* Error State */}
        {micState === 'error' && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
            <div className="flex items-start gap-2 text-xs font-semibold text-rose-300 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{micErrorMessage || 'Microphone error detected.'}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {requestMicPermission && (
                <button
                  type="button"
                  onClick={() => void requestMicPermission()}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow active:scale-95"
                >
                  Request Mic Permission
                </button>
              )}
              {onToggleChat && (
                <button
                  type="button"
                  onClick={onToggleChat}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3 w-3 text-orange-400" />
                  <span>Open Chat to Type</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Speech / Editable Review State */}
        {hasCandidateSpeech ? (
          <div className="space-y-2">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={candidateSpeechText}
                onChange={(e) => setCandidateSpeechText?.(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your spoken words will appear here in real time..."
                rows={2}
                disabled={aiState === 'evaluating'}
                className="w-full bg-slate-900/80 border border-emerald-500/30 rounded-xl p-2.5 text-xs font-medium text-emerald-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none transition-all leading-relaxed"
              />
            </div>

            {aiState === 'listening' && (
              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="flex items-center gap-2">
                  {clearCandidateSpeech && (
                    <button
                      type="button"
                      onClick={clearCandidateSpeech}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-medium border border-white/10 transition-all cursor-pointer"
                      title="Clear draft and re-speak"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Re-speak</span>
                    </button>
                  )}
                  {silenceCountdown !== null && silenceCountdown > 0 && (
                    <span className="text-[10px] font-medium text-amber-300/90 animate-pulse">
                      Auto-sending in {silenceCountdown}s...
                    </span>
                  )}
                </div>

                {onSubmitResponse && (
                  <button
                    type="button"
                    onClick={() => onSubmitResponse(candidateSpeechText.trim())}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <span>Submit Answer</span>
                    <Send className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : micState !== 'error' && (
          <div>
            {aiState === 'listening' ? (
              <div className="py-2 flex flex-col items-center justify-center text-center space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                  <Mic className="h-3.5 w-3.5 animate-pulse" />
                  <span>Listening... Speak your answer into the microphone.</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Words will appear here as you speak. You can review or edit before sending.
                </p>
              </div>
            ) : aiState === 'evaluating' ? (
              <p className="text-xs font-medium text-purple-300 italic animate-pulse">
                Evaluating your response and preparing the next question...
              </p>
            ) : lastCandidateTurnContent ? (
              <p className="text-xs font-semibold text-slate-200 leading-relaxed">
                &ldquo;{lastCandidateTurnContent}&rdquo;
              </p>
            ) : (
              <p className="text-xs font-medium text-slate-500 italic">
                AI interviewer is speaking... Listen to the question.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
