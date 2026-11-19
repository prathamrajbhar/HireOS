'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, ListChecks, Sliders, UploadCloud, Loader2 } from '@/lib/lucide-google-icons';
import { AssessmentQuestion } from '@/types/assessment-question';
import { AssessmentQuestionReviewModal } from './AssessmentQuestionReviewModal';
import { GenerateQuestionsConfigModal } from './GenerateQuestionsConfigModal';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/contexts/ToastContext';

interface AssessmentCustomQuestionsSectionProps {
  customQuestions?: AssessmentQuestion[];
  onUpdateCustomQuestions: (questions: AssessmentQuestion[]) => void;
  categoryDistribution?: Record<string, number>;
  mcqCount?: number;
  jdText: string;
  roleTitle?: string;
  skills?: string[];
  experienceLevel?: string;
}

export function AssessmentCustomQuestionsSection({
  customQuestions = [],
  onUpdateCustomQuestions,
  categoryDistribution = { 'Quantitative Aptitude': 2, 'Logical Reasoning': 2, 'Verbal Ability': 2, 'Data Interpretation': 2 },
  mcqCount,
  jdText,
  roleTitle,
  skills = [],
  experienceLevel,
}: AssessmentCustomQuestionsSectionProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [tempQuestions, setTempQuestions] = useState<AssessmentQuestion[]>(customQuestions);

  const handleOpenConfig = () => {
    if (!jdText || jdText.trim().length < 15) {
      toast({
        title: 'Job Description Required',
        description: 'Please write or generate a job description first before creating assessment questions.',
        variant: 'error',
      });
      return;
    }
    setIsConfigOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
      toast({
        title: 'PDF File Required',
        description: 'Please upload your question bank as a PDF document.',
        variant: 'error',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Question bank PDF must be 15MB or less.',
        variant: 'error',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (roleTitle) {
        formData.append('roleTitle', roleTitle);
      }

      const res = await apiClient.post<{
        questions: AssessmentQuestion[];
        total: number;
        breakdown: { easy: number; intermediate: number; advanced: number };
      }>('/jobs/upload-question-bank', formData);

      if (res && Array.isArray(res.questions) && res.questions.length > 0) {
        setTempQuestions(res.questions);
        setIsReviewOpen(true);
        toast({
          title: 'Question Bank Uploaded',
          description: `Extracted ${res.questions.length} questions from "${file.name}". Review and adjust them below.`,
          variant: 'success',
        });
      } else {
        throw new Error('No assessment questions could be identified in this PDF.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse questions from uploaded PDF';
      toast({
        title: 'Question Bank Parsing Failed',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExecuteGenerate = async (params: {
    difficulty: import('@/types/assessment-question').AssessmentDifficulty;
    categoryDistribution: Record<string, number>;
  }) => {
    setIsGenerating(true);
    try {
      const res = await apiClient.post<{
        questions: AssessmentQuestion[];
        total: number;
        breakdown: { easy: number; intermediate: number; advanced: number };
      }>('/jobs/generate-questions', {
        title: roleTitle,
        description: jdText,
        skills,
        experienceLevel,
        difficulty: params.difficulty,
        categoryDistribution: params.categoryDistribution,
      });

      if (res && Array.isArray(res.questions) && res.questions.length > 0) {
        setTempQuestions(res.questions);
        setIsConfigOpen(false);
        setIsReviewOpen(true);
        toast({
          title: 'Questions Generated',
          description: `Created ${res.questions.length} questions matching your HR distribution at ${params.difficulty} difficulty.`,
          variant: 'success',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate assessment questions';
      toast({
        title: 'Generation Failed',
        description: msg,
        variant: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const hasCustom = customQuestions && customQuestions.length > 0;
  const easyCount = customQuestions.filter((q) => q.difficulty === 'easy').length;
  const intCount = customQuestions.filter((q) => q.difficulty === 'intermediate').length;
  const advCount = customQuestions.filter((q) => q.difficulty === 'advanced').length;

  return (
    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
      {/* Header Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              AI Assessment Questions
            </h4>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-750">
              From JD or PDF Bank
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
            Generate with AI from your Job Description or upload your own question bank in PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenConfig}
            disabled={isGenerating || isUploadingPdf}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Sliders className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>{hasCustom ? 'Regenerate with AI' : 'Generate with AI'}</span>
          </button>

          <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0">
            {isUploadingPdf ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600 dark:text-brand-400" />
                <span>Parsing PDF...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                <span>Upload PDF Bank</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              disabled={isUploadingPdf || isGenerating}
              onChange={handlePdfUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Configured Status Card */}
      {hasCustom && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {customQuestions.length} Custom Questions Configured
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {easyCount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{easyCount} Easy</span>
                )}
                {intCount > 0 && (
                  <>
                    {easyCount > 0 && <span>•</span>}
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{intCount} Intermediate</span>
                  </>
                )}
                {advCount > 0 && (
                  <>
                    {(easyCount > 0 || intCount > 0) && <span>•</span>}
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">{advCount} Advanced</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTempQuestions(customQuestions);
              setIsReviewOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/60 transition-all active:scale-95 cursor-pointer"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>Review &amp; Edit</span>
          </button>
        </div>
      )}

      {/* 1. Configuration Modal: Select Easy / Intermediate / Advanced */}
      <GenerateQuestionsConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onGenerate={handleExecuteGenerate}
        isGenerating={isGenerating}
        roleTitle={roleTitle}
        categoryDistribution={categoryDistribution}
        totalQuestions={mcqCount}
      />

      {/* 2. Review Modal: Review, edit options, answers, delete, or save */}
      <AssessmentQuestionReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        questions={tempQuestions}
        onSave={onUpdateCustomQuestions}
        roleTitle={roleTitle}
      />
    </div>
  );
}
