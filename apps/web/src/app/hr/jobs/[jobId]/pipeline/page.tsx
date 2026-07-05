'use client';

import React, { useState, use } from 'react';
import { mockJobs, mockApplications } from '@/lib/mockData';

// Subcomponents
import PipelineHeader from './components/PipelineHeader';
import KanbanColumn from './components/KanbanColumn';
import CandidateCard from './components/CandidateCard';
import AgentLogsPanel from './components/AgentLogsPanel';
import EditThresholdModal from './components/EditThresholdModal';

export default function HrJobPipeline({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  // Retrieve matching job details
  const job = mockJobs.find((j) => j.id === jobId) || mockJobs[0];

  // Candidates applied for this specific job, loaded into initial state
  const jobApps = mockApplications.filter((app) => app.jobId === job.id);
  const [candidates, setCandidates] = useState(jobApps);

  // Gating thresholds state
  const [minScore, setMinScore] = useState(job.thresholds.minScore);
  const [autoOffer, setAutoOffer] = useState(job.thresholds.autoOffer);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Streaming console logs state
  const [logs, setLogs] = useState([
    `Screening Agent: Identified ${jobApps.length} active applicant profiles.`,
    'Evaluator Agent: Standard grading scorecards initialized.',
    `Bias Auditor: Contextual audits calibrated for ${job.title}.`
  ]);
  const [pipelineActive, setPipelineActive] = useState(true);

  // Stage advancement simulation
  const handleSimulate = () => {
    if (!pipelineActive) return;

    // Find candidates who have not reached the 'Decision' phase
    const eligibleCandidates = candidates.filter((c) => c.stage !== 'Decision');
    if (eligibleCandidates.length === 0) {
      setLogs((prev) => [
        'Pipeline Agent: All active applications have been fully processed.',
        ...prev.slice(0, 10)
      ]);
      return;
    }

    // Select a random candidate to advance
    const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
    const chosen = eligibleCandidates[randomIndex];

    const stageProgression: Record<
      'Sourced' | 'Screened' | 'Interview' | 'Decision',
      'Sourced' | 'Screened' | 'Interview' | 'Decision'
    > = {
      Sourced: 'Screened',
      Screened: 'Interview',
      Interview: 'Decision',
      Decision: 'Decision'
    };

    const nextStage = stageProgression[chosen.stage];

    // Update candidate stage
    setCandidates((prev) =>
      prev.map((c) => (c.id === chosen.id ? { ...c, stage: nextStage } : c))
    );

    // Formulate a dynamic terminal console log
    let logMessage = '';
    if (nextStage === 'Screened') {
      const auditResult = chosen.biasReport && chosen.biasReport.flaggedPhrases.length > 0
        ? 'flagged content warnings'
        : 'bias checks passed';
      logMessage = `Screening Agent: Completed resume vetting and bias audits on ${chosen.candidateName} (${auditResult}).`;
    } else if (nextStage === 'Interview') {
      logMessage = `Interviewer Agent: Dispatched AI voice session invite link to ${chosen.candidateName}. Slot reservation pending.`;
    } else if (nextStage === 'Decision') {
      const candidateScore = chosen.scores?.composite || 78;
      const isShortlisted = candidateScore >= minScore;
      const action = isShortlisted
        ? autoOffer 
          ? 'Dispatching automated offer contracts.'
          : 'Added to hiring shortlist for review.'
        : 'Archived application (below shortlist threshold).';
      logMessage = `Decision Agent: Grade report ready for ${chosen.candidateName} (Composite Score: ${candidateScore}% vs Min Threshold: ${minScore}%). ${action}`;
    }

    setLogs((prev) => [logMessage, ...prev.slice(0, 12)]);
  };

  const getColCandidates = (stage: 'Sourced' | 'Screened' | 'Interview' | 'Decision') => {
    return candidates.filter((c) => c.stage === stage);
  };

  const columns: { id: 'Sourced' | 'Screened' | 'Interview' | 'Decision'; name: string }[] = [
    { id: 'Sourced', name: 'Applied' },
    { id: 'Screened', name: 'AI Screened' },
    { id: 'Interview', name: 'AI Interview' },
    { id: 'Decision', name: 'Final Decision' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header controls section */}
      <PipelineHeader
        jobTitle={job.title}
        pipelineActive={pipelineActive}
        setPipelineActive={setPipelineActive}
        onSimulate={handleSimulate}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Kanban Columns & logs sidebar layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Kanban Board Columns */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colApps = getColCandidates(col.id);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                name={col.name}
                count={colApps.length}
              >
                {colApps.map((app) => (
                  <CandidateCard key={app.id} app={app} />
                ))}
              </KanbanColumn>
            );
          })}
        </div>

        {/* Live console logging */}
        <div className="lg:col-span-1">
          <AgentLogsPanel logs={logs} />
        </div>
      </div>

      {/* Threshold settings Modal */}
      <EditThresholdModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        minScore={minScore}
        setMinScore={setMinScore}
        autoOffer={autoOffer}
        setAutoOffer={setAutoOffer}
      />
    </div>
  );
}
