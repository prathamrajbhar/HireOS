'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CandidateAssessmentPageRedirect({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/candidate/mock/session-${applicationId}?applicationId=${applicationId}&track=aptitude`);
  }, [applicationId, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-bold font-sans">
      Redirecting to unified assessment console...
    </div>
  );
}
