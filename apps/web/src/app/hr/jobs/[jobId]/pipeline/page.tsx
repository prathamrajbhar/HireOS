'use client';

import React, { useState, use, useEffect } from 'react';
import { getStoredJobs, mockApplications } from '@/lib/mockData';

// Subcomponents
import PipelineHeader from './components/PipelineHeader';
import KanbanColumn from './components/KanbanColumn';
import CandidateCard from './components/CandidateCard';
import AgentLogsPanel from './components/AgentLogsPanel';
import EditThresholdModal from './components/EditThresholdModal';

export default function HrJobPipeline({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);

  // Retrieve matching job details from local storage
  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Gating thresholds state
  const [minScore, setMinScore] = useState(80);
  const [autoOffer, setAutoOffer] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Streaming console logs state
  const [logs, setLogs] = useState<string[]>([]);
  const [pipelineActive, setPipelineActive] = useState(true);

  useEffect(() => {
    const jobsList = getStoredJobs();
    const foundJob = jobsList.find((j) => j.id === jobId) || jobsList[0];
    if (foundJob) {
      setJob(foundJob);
      setMinScore(foundJob.thresholds.minScore);
      setAutoOffer(foundJob.thresholds.autoOffer);
      
      // Load applications matching this job
      const jobApps = mockApplications.filter((app) => app.jobId === foundJob.id);
      
      // Map stages for applications to fit the new pipeline
      // We check if applicants have stages that are now disabled, and normalize them
      const activeStages = foundJob.stages || ['screening', 'assessment', 'voice_screen', 'decision'];
      const normalizedApps = jobApps.map((app) => {
        let appStage = app.stage;
        if (appStage === 'Screened' && !activeStages.includes('screening')) {
          appStage = 'Sourced';
        }
        if (appStage === 'Assessment' && !activeStages.includes('assessment')) {
          appStage = activeStages.includes('screening') ? 'Screened' : 'Sourced';
        }
        if (appStage === 'Interview' && !activeStages.includes('voice_screen')) {
          appStage = activeStages.includes('assessment') ? 'Assessment' : activeStages.includes('screening') ? 'Screened' : 'Sourced';
        }
        return {
          ...app,
          stage: appStage
        };
      });

      setCandidates(normalizedApps);

      setLogs([
        `Screening Agent: Identified ${jobApps.length} active applicant profiles.`,
        `Pipeline Designer: Calibrated pipeline stages [Applied -> ${activeStages.map(s => s.replace('_', ' ')).join(' -> ')} -> Decision].`,
        `Bias Auditor: Double-pass auditing calibrated for ${foundJob.title}.`
      ]);
    }
  }, [jobId]);

  if (!job) {
    return <div className="text-center p-8 text-xs font-bold text-slate-400">Loading pipeline...</div>;
  }

  // Generate dynamic columns based on job stages
  const columns: { id: 'Sourced' | 'Screened' | 'Assessment' | 'Interview' | 'Panel' | 'Decision'; name: string }[] = [
    { id: 'Sourced', name: 'Applied' }
  ];

  const activeStages = job.stages || ['screening', 'assessment', 'voice_screen', 'decision'];

  if (activeStages.includes('screening')) {
    columns.push({ id: 'Screened', name: 'AI Screened' });
  }
  if (activeStages.includes('assessment')) {
    columns.push({ id: 'Assessment', name: 'Assessment' });
  }
  if (activeStages.includes('voice_screen')) {
    columns.push({ id: 'Interview', name: 'AI Interview' });
  }
  if (activeStages.includes('panel')) {
    columns.push({ id: 'Panel', name: 'Live Panel' });
  }
  columns.push({ id: 'Decision', name: 'Final Decision' });

  // Stage advancement simulation
  const handleSimulate = () => {
    if (!pipelineActive) return;

    // Find candidates who have not reached the final 'Decision' phase
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

    // Find next stage in our dynamic list of active columns
    const currentIdx = columns.findIndex(col => col.id === chosen.stage);
    if (currentIdx === -1 || currentIdx >= columns.length - 1) return;

    const nextCol = columns[currentIdx + 1];
    const nextStage = nextCol.id;

    // Update candidate stage
    setCandidates((prev) =>
      prev.map((c) => (c.id === chosen.id ? { ...c, stage: nextStage } : c))
    );

    // Formulate a dynamic log message
    let logMessage = '';
    if (nextStage === 'Screened') {
      const auditResult = chosen.biasReport && chosen.biasReport.flaggedPhrases.length > 0
        ? 'flagged content warnings'
        : 'bias checks passed';
      logMessage = `Screening Agent: Completed resume vetting and bias audits on ${chosen.candidateName} (${auditResult}).`;
    } else if (nextStage === 'Assessment') {
      logMessage = `Assessment Agent: Sent MCQ + Coding assessment link to ${chosen.candidateName} (Challenge: ${job.assessmentConfig?.codingProblemId || 'virtualized-list'}).`;
    } else if (nextStage === 'Interview') {
      logMessage = `Interviewer Agent: Dispatched AI voice session invite link to ${chosen.candidateName}. Slot reservation pending.`;
    } else if (nextStage === 'Panel') {
      logMessage = `Panel Coordinator: Scheduling live technical panel evaluation for ${chosen.candidateName} with the hiring board.`;
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

  const getColCandidates = (stage: string) => {
    return candidates.filter((c) => c.stage === stage);
  };

  const gridColsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  }[columns.length] || 'md:grid-cols-4';

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
        <div className={`lg:col-span-3 grid grid-cols-1 ${gridColsClass} gap-4 items-start`}>
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
