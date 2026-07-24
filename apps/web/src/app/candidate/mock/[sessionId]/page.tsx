'use client';

import React, { use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mockSessions, mockApplications, mockJobs } from '@/lib/mockData';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import InterviewCheckScreen from '@/components/interview/InterviewCheckScreen';
import InterviewActiveConsole from '@/components/interview/InterviewActiveConsole';
import AptitudeTestConsole from '@/components/interview/AptitudeTestConsole';
import CodingAssessmentConsole from '@/components/interview/CodingAssessmentConsole';

function MockSessionContent({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const track = searchParams.get('track') || 'technical';
  const applicationId = searchParams.get('applicationId');

  const { sessionId } = use(params);
  const session = mockSessions.find((s) => s.id === sessionId) || mockSessions[0];

  // Resolve target company & role (supports both real candidate application and mock practice mode)
  const app = applicationId ? mockApplications.find((a) => a.id === applicationId) : null;
  const job = app ? mockJobs.find((j) => j.id === app.jobId) : null;

  const targetCompany = app?.orgName || job?.orgName || session.targetCompany;
  const targetRole = app?.jobTitle || job?.title || session.targetRole;

  const handleComplete = (score?: number) => {
    if (applicationId) {
      localStorage.setItem(`candidateAssessmentCompleted_${applicationId}`, 'true');
      const scoreObj = {
        overallScore: score || 91,
        completedDate: new Date().toISOString().slice(0, 10),
      };
      localStorage.setItem(`assessmentResult_${applicationId}`, JSON.stringify(scoreObj));
      router.push(`/candidate/applications/${applicationId}`);
    } else {
      router.push(`/candidate/mock/${sessionId}/feedback`);
    }
  };

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
    company: targetCompany,
    role: targetRole,
    difficulty: session.difficulty,
    storageKey: `mockSession_${sessionId}`,
    onComplete: () => handleComplete(),
  });

  // Render Aptitude Test Console (used for both real candidate applications & mock practice)
  if (track === 'aptitude') {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-white overflow-y-auto p-4">
        <AptitudeTestConsole
          company={targetCompany}
          role={targetRole}
          onComplete={(score) => handleComplete(score)}
        />
      </div>
    );
  }

  // Render Coding Assessment Console (used for both real candidate applications & mock practice)
  if (track === 'coding') {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-white overflow-y-auto p-4">
        <CodingAssessmentConsole
          company={targetCompany}
          role={targetRole}
          onComplete={(score) => handleComplete(score)}
        />
      </div>
    );
  }

  // Hardware Check Screen
  if (stage === 'check') {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-white overflow-y-auto">
        <InterviewCheckScreen
          company={targetCompany}
          role={targetRole}
          camActive={camActive}
          onJoin={startSession}
        />
      </div>
    );
  }

  // AI Voice Conversational Interview Console
  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-white flex flex-col justify-between overflow-hidden p-2">
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
        company={targetCompany}
        role={targetRole}
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
