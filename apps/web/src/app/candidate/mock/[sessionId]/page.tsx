'use client';

import React, { use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockSessions } from '@/lib/mockData';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import InterviewCheckScreen from '@/components/interview/InterviewCheckScreen';
import InterviewActiveConsole from '@/components/interview/InterviewActiveConsole';
import AptitudeTestConsole from '@/components/interview/AptitudeTestConsole';
import CodingAssessmentConsole from '@/components/interview/CodingAssessmentConsole';

function MockSessionContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const track = searchParams.get('track') || 'technical';

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

  if (stage === 'check') {
    return (
      <InterviewCheckScreen
        company={session.targetCompany}
        role={session.targetRole}
        camActive={camActive}
        onJoin={startSession}
      />
    );
  }

  // Render Assessment Round interface based on selected track
  if (track === 'aptitude') {
    return (
      <AptitudeTestConsole
        company={session.targetCompany}
        role={session.targetRole}
        onComplete={() => router.push(`/candidate/mock/${sessionId}/feedback`)}
      />
    );
  }

  if (track === 'coding') {
    return (
      <CodingAssessmentConsole
        company={session.targetCompany}
        role={session.targetRole}
        onComplete={() => router.push(`/candidate/mock/${sessionId}/feedback`)}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden p-2">
      <InterviewActiveConsole
        messages={messages}
        phase={phase}
        timeRemaining={timeRemaining}
        micActive={micActive}
        camActive={camActive}
        isAnalyzing={isAnalyzing}
        isSimulating={isSimulating}
        isDarkTheme={true}
        onSubmitAnswer={submitAnswer}
        onSimulateSpeaking={simulateSpeaking}
        onEndSession={wrapUp}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        company={session.targetCompany}
        role={session.targetRole}
      />
    </div>
  );
}

export default function MockSessionRoom({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 p-8">
          Loading assessment room...
        </div>
      }
    >
      <MockSessionContent params={params} />
    </Suspense>
  );
}
