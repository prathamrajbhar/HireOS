'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { mockApplications } from '@/lib/mockData';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import InterviewCheckScreen from '@/components/interview/InterviewCheckScreen';
import InterviewActiveConsole from '@/components/interview/InterviewActiveConsole';

export default function LiveInterviewRoom({ params }: { params: Promise<{ interviewId: string }> }) {
  const router = useRouter();
  const { interviewId } = use(params);
  const app = mockApplications.find((a) => a.id === interviewId) || mockApplications[0];

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
    company: app.orgName,
    role: app.jobTitle,
    difficulty: 'mid',
    storageKey: `candidateInterview_${interviewId}`,
    onComplete: () => {
      router.push(`/candidate/applications/${interviewId}`);
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center p-6">
      {stage === 'check' ? (
        <div className="max-w-md mx-auto text-slate-800">
          <InterviewCheckScreen
            company={app.orgName}
            role={app.jobTitle}
            camActive={camActive}
            onJoin={startSession}
          />
        </div>
      ) : (
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
        />
      )}
    </div>
  );
}
