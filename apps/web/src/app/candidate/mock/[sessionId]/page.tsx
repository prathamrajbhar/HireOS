'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { mockSessions } from '@/lib/mockData';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import InterviewCheckScreen from '@/components/interview/InterviewCheckScreen';
import InterviewActiveConsole from '@/components/interview/InterviewActiveConsole';

export default function MockSessionRoom({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const { sessionId } = use(params);
  const session = mockSessions.find((s) => s.id === sessionId) || mockSessions[0];

  const {
    stage,
    phase,
    messages,
    timeRemaining,
    micActive,
    camActive,
    isAnalyzing,
    isSimulating,
    startSession,
    submitAnswer,
    simulateSpeaking,
    wrapUp,
    toggleMic,
    toggleCam,
  } = useInterviewSession({
    company: session.targetCompany,
    role: session.targetRole,
    difficulty: session.difficulty,
    storageKey: `mockSession_${sessionId}`,
    onComplete: () => {
      router.push(`/candidate/mock/${sessionId}/feedback`);
    },
  });

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col justify-center p-6">
      {stage === 'check' ? (
        <InterviewCheckScreen
          company={session.targetCompany}
          role={session.targetRole}
          camActive={camActive}
          onJoin={startSession}
        />
      ) : (
        <InterviewActiveConsole
          messages={messages}
          phase={phase}
          timeRemaining={timeRemaining}
          micActive={micActive}
          camActive={camActive}
          isAnalyzing={isAnalyzing}
          isSimulating={isSimulating}
          onSubmitAnswer={submitAnswer}
          onSimulateSpeaking={simulateSpeaking}
          onEndSession={wrapUp}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
        />
      )}
    </div>
  );
}
