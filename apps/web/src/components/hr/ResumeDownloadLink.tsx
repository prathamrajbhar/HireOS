'use client';

import React from 'react';
import { hrResumeHref } from '@/lib/resumeFile';

interface ResumeDownloadLinkProps {
  applicationId: string;
  resumeUrl?: string | null;
  className?: string;
  children: React.ReactNode;
}

/** Opens the candidate's actually-uploaded resume; disabled when none was uploaded. */
export function ResumeDownloadLink({ applicationId, resumeUrl, className = '', children }: ResumeDownloadLinkProps) {
  if (!resumeUrl) {
    return (
      <span
        title="Candidate has not uploaded a resume"
        aria-disabled="true"
        className={`${className} opacity-50 cursor-not-allowed pointer-events-none`}
      >
        {children}
      </span>
    );
  }
  return (
    <a href={hrResumeHref(applicationId)} target="_blank" rel="noopener noreferrer" download className={className}>
      {children}
    </a>
  );
}
