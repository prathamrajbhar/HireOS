'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Shield } from 'lucide-react';
import { Message, InterviewPhase } from '@/hooks/useInterviewSession';

interface ActiveConsoleProps {
  messages: Message[];
  phase: InterviewPhase;
  timeRemaining: number;
  micActive: boolean;
  camActive: boolean;
  isAnalyzing: boolean;
  isSimulating: boolean;
  isDarkTheme?: boolean;
  onSubmitAnswer: (text: string) => void;
  onSimulateSpeaking: () => void;
  onEndSession: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
}

export default function InterviewActiveConsole({
  messages, phase, timeRemaining, micActive, camActive, isAnalyzing, isSimulating, isDarkTheme = false,
  onSimulateSpeaking, onEndSession, onToggleMic, onToggleCam,
}: ActiveConsoleProps) {
  const [gazeScore, setGazeScore] = useState(94);

  useEffect(() => {
    if (!camActive) return;
    const interval = setInterval(() => setGazeScore(Math.floor(Math.random() * 6) + 91), 2500);
    return () => clearInterval(interval);
  }, [camActive]);

  const lastMsg = messages[messages.length - 1];
  const aiSpeaking = lastMsg && lastMsg.role === 'ai';

  const getStatusText = () => {
    if (isAnalyzing) return 'Analyzing response...';
    if (isSimulating) return 'Listening to you...';
    if (aiSpeaking) return 'AI Speaking...';
    return 'AI Waiting...';
  };

  const getStatusColor = () => {
    if (isAnalyzing) return 'bg-purple-650 text-white animate-pulse';
    if (isSimulating) return 'bg-emerald-600 text-white animate-pulse';
    if (aiSpeaking) return 'bg-indigo-600 text-white';
    return 'bg-slate-600 text-white';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col gap-6 p-6 rounded-3xl border shadow-xl transition-all ${
      isDarkTheme ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200/80 text-slate-800'
    }`}>
      {/* Top Header - Super Clean Progress */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Stage:</span>
          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md border ${
            isDarkTheme 
              ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400' 
              : 'bg-indigo-50 border-indigo-100/50 text-indigo-700'
          }`}>
            {phase}
          </span>
        </div>
        <span className={`font-mono font-black text-xs tracking-wider ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
          TIME REMAINING: {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Main Video Viewport - Center Stage */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video w-full flex items-center justify-center shadow-lg group">
        {camActive ? (
          <div className="w-full h-full flex items-center justify-center text-slate-655 font-bold relative">
            <span className="text-xs tracking-wider opacity-60">Webcam Vetting Stream Active</span>
            
            {/* Minimal overlays - High-end assessment feel */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[9px] font-bold tracking-wider text-emerald-400 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Gaze Focus: {gazeScore}%</span>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[9px] font-bold tracking-wider text-white select-none">
              <Shield className="h-3 w-3 text-indigo-400" />
              <span>Proctor Secure</span>
            </div>

            {/* AI Status Badge Overlay on video */}
            <div className={`absolute bottom-4 left-4 flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-bold tracking-wider uppercase select-none shadow-md ${getStatusColor()}`}>
              {aiSpeaking && <Volume2 className="h-3 w-3 animate-pulse" />}
              <span>{getStatusText()}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
            <VideoOff className="h-5 w-5 text-slate-600 animate-pulse" />
            <span>Camera stream deactivated</span>
          </div>
        )}
      </div>

      {/* Simplified, borderless captions below video */}
      <div className="px-4 py-2 min-h-[50px] flex items-center justify-center">
        <p className={`text-xs md:text-sm font-semibold tracking-wide text-center leading-relaxed max-w-2xl ${
          isDarkTheme ? 'text-slate-200' : 'text-slate-800'
        }`}>
          {isSimulating 
            ? `Captions: "${lastMsg?.content || ''}"` 
            : lastMsg 
              ? `"${lastMsg.content}"`
              : 'Starting dynamic conversation portal...'}
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4 border-slate-100">
        <div className="flex items-center gap-2">
          <button onClick={onToggleMic} className={`p-2.5 rounded-xl border cursor-pointer transition-all ${micActive ? 'bg-white hover:bg-slate-55 text-slate-700 border-slate-200' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>{micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
          <button onClick={onToggleCam} className={`p-2.5 rounded-xl border cursor-pointer transition-all ${camActive ? 'bg-white hover:bg-slate-55 text-slate-700 border-slate-200' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>{camActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onSimulateSpeaking} disabled={isSimulating || isAnalyzing} className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow disabled:opacity-50 cursor-pointer">✦ Simulate Speaking</button>
          <button onClick={onEndSession} className="px-4 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow"><PhoneOff className="h-3.5 w-3.5" />End Session</button>
        </div>
      </div>
    </div>
  );
}
