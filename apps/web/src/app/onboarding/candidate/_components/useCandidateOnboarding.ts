'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import type { EducationEntry } from '@nextround/shared';
import {
  CandidateForm,
  DEFAULT_FORM,
  TagField,
  ParsedProfilePayload,
  WorkMode,
  OnboardingStepProps,
  buildCandidatePayload,
} from './candidateOnboarding.types';

export type { WorkMode, CandidateForm, TagField, ParsedProfilePayload, OnboardingStepProps };
export { DEFAULT_FORM, buildCandidatePayload };

export function useCandidateOnboarding() {
  const { user } = useAuth();
  const [form, setForm] = useState<CandidateForm>(() => ({
    ...DEFAULT_FORM,
    fullName: user?.name || '',
  }));
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchExisting = async () => {
      try {
        const res = await apiClient.get<{ profile?: Record<string, unknown> }>('/candidate/profile');
        if (mounted && res?.profile) {
          const p = res.profile;
          const pr = ((p.parsedResume || p.parsed_resume || {}) as Record<string, unknown>);
          const prRoles = Array.isArray(pr.targetRoles) ? (pr.targetRoles as string[]) : [];
          const existingHeadline = (p.headline as string) || (pr.headline as string) || '';
          const existingCompany = (p.currentCompany as string) || (pr.currentCompany as string) || '';
          const existingTitle = (p.currentTitle as string) || (pr.currentTitle as string) || '';

          setForm((f) => ({
            ...f,
            fullName: (p.fullName as string) || (p.full_name as string) || (pr.fullName as string) || user?.name || f.fullName,
            headline: existingHeadline || f.headline,
            phone: (p.phone as string) || (pr.phone as string) || f.phone,
            location: (p.location as string) || (pr.location as string) || f.location,
            timezone: (p.timezone as string) || (pr.timezone as string) || f.timezone,
            currentCompany: existingCompany,
            currentTitle: existingTitle,
            education: (Array.isArray(p.education) && p.education.length > 0) ? p.education : (Array.isArray(pr.education) ? (pr.education as EducationEntry[]) : f.education),
            yearsOfExperience: p.yearsOfExperience !== undefined && p.yearsOfExperience !== null ? String(p.yearsOfExperience) : (pr.yearsOfExperience !== undefined ? String(pr.yearsOfExperience) : f.yearsOfExperience),
            skills: (Array.isArray(p.skills) && p.skills.length > 0) ? (p.skills as string[]) : (Array.isArray(pr.skills) && (pr.skills as string[]).length > 0 ? (pr.skills as string[]) : f.skills),
            targetRoles: (Array.isArray(p.targetRoles) && p.targetRoles.length > 0) ? (p.targetRoles as string[]) : (prRoles.length > 0 ? prRoles : f.targetRoles),
            workMode: (p.workMode as WorkMode) || (pr.workMode as WorkMode) || f.workMode,
            currentCtc: p.currentCtc !== undefined && p.currentCtc !== null ? String(p.currentCtc) : (pr.currentCtc !== undefined ? String(pr.currentCtc) : f.currentCtc),
            expectedSalary: p.expectedSalary !== undefined && p.expectedSalary !== null ? String(p.expectedSalary) : (pr.expectedSalary !== undefined ? String(pr.expectedSalary) : f.expectedSalary),
            noticePeriod: (p.noticePeriod as string) || (pr.noticePeriod as string) || f.noticePeriod,
            workAuthorization: (p.workAuthorization as string) || (pr.workAuthorization as string) || f.workAuthorization,
            bio: (p.bio as string) || (pr.bio as string) || f.bio,
            proudProject: (p.proudProject as string) || (pr.proudProject as string) || f.proudProject,
          }));
        } else if (mounted && user?.name && !form.fullName) {
          setForm((f) => ({ ...f, fullName: user.name || f.fullName }));
        }
      } catch {
        if (mounted && user?.name && !form.fullName) {
          setForm((f) => ({ ...f, fullName: user.name || f.fullName }));
        }
      }
    };
    fetchExisting();
    return () => {
      mounted = false;
    };
  }, [user]);

  const update = <K extends keyof CandidateForm>(key: K, value: CandidateForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTag = (key: TagField, value: string) => {
    const trimmed = value.trim();
    if (trimmed && !form[key].includes(trimmed)) {
      setForm((f) => ({ ...f, [key]: [...f[key], trimmed] }));
    }
  };

  const removeTag = (key: TagField, value: string) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((v) => v !== value) }));

  const mergeParsedProfile = (parsed: ParsedProfilePayload, rawText?: string) => {
    setForm((f) => {
      // Auto-fill ONLY fields that are found in the parsed resume.
      // If a field is not found (e.g. for a fresher who has no current job and no current company),
      // that field must not be auto-filled or populated with fallback/assumed values.
      const isNewResume = !!rawText;

      const hasValidExpectedSalary = parsed.expectedSalary !== undefined && parsed.expectedSalary !== null && Number(parsed.expectedSalary) > 0;
      const parsedSalaryNum = hasValidExpectedSalary ? Number(parsed.expectedSalary) : undefined;
      const expectedSalaryMin = parsedSalaryNum
        ? String(Math.max(1, Math.round(parsedSalaryNum * 0.8)))
        : (isNewResume ? '' : f.expectedSalaryMin);
      const expectedSalaryMax = parsedSalaryNum
        ? String(Math.round(parsedSalaryNum * 1.3))
        : (isNewResume ? '' : f.expectedSalaryMax);

      return {
        ...f,
        rawResumeText: rawText || f.rawResumeText,
        parsedResume: (parsed as Record<string, unknown>) || f.parsedResume,
        fullName: parsed.fullName?.trim() || f.fullName || user?.name || '',
        headline: parsed.headline?.trim() || (isNewResume ? '' : f.headline),
        currentCompany: parsed.currentCompany?.trim() || (isNewResume ? '' : f.currentCompany),
        currentTitle: parsed.currentTitle?.trim() || (isNewResume ? '' : f.currentTitle),
        education: Array.isArray(parsed.education) && parsed.education.length > 0 ? parsed.education : (isNewResume ? [] : f.education),
        phone: parsed.phone?.trim() || (isNewResume ? '' : f.phone),
        location: parsed.location?.trim() || (isNewResume ? '' : f.location),
        timezone: parsed.timezone?.trim() || f.timezone,
        linkedinUrl: parsed.linkedinUrl?.trim() || (isNewResume ? '' : f.linkedinUrl),
        githubUrl: parsed.githubUrl?.trim() || (isNewResume ? '' : f.githubUrl),
        portfolioUrl: parsed.portfolioUrl?.trim() || (isNewResume ? '' : f.portfolioUrl),
        yearsOfExperience: parsed.yearsOfExperience !== undefined && parsed.yearsOfExperience !== null
          ? String(parsed.yearsOfExperience)
          : (isNewResume ? '' : f.yearsOfExperience),
        skills: Array.isArray(parsed.skills) && parsed.skills.length > 0
          ? Array.from(new Set(parsed.skills.map((s) => s.trim()).filter(Boolean)))
          : (isNewResume ? [] : f.skills),
        targetRoles: Array.isArray(parsed.targetRoles) && parsed.targetRoles.length > 0
          ? Array.from(new Set(parsed.targetRoles.map((r) => r.trim()).filter(Boolean)))
          : (isNewResume ? [] : f.targetRoles),
        targetLocations: Array.isArray(parsed.targetLocations) && parsed.targetLocations.length > 0
          ? Array.from(new Set(parsed.targetLocations.map((l) => l.trim()).filter(Boolean)))
          : (isNewResume ? [] : f.targetLocations),
        workMode: parsed.workMode || f.workMode,
        expectedSalary: hasValidExpectedSalary ? String(parsed.expectedSalary) : (isNewResume ? '' : f.expectedSalary),
        expectedSalaryMin,
        expectedSalaryMax,
        currentCtc: parsed.currentCtc !== undefined && parsed.currentCtc !== null && Number(parsed.currentCtc) > 0
          ? String(parsed.currentCtc)
          : (isNewResume ? '' : f.currentCtc),
        noticePeriod: parsed.noticePeriod?.trim() || (isNewResume ? '' : f.noticePeriod),
        workAuthorization: parsed.workAuthorization?.trim() || (isNewResume ? '' : f.workAuthorization),
        bio: parsed.bio?.trim() || (isNewResume ? '' : f.bio),
        proudProject: parsed.proudProject?.trim() || (isNewResume ? '' : f.proudProject),
      };
    });
  };


  const mergeSocialData = (social: Record<string, unknown>, extractedSkills?: string[]) => {
    setForm((f) => ({
      ...f,
      socialData: social,
      skills: extractedSkills && extractedSkills.length > 0 ? Array.from(new Set([...f.skills, ...extractedSkills])) : f.skills,
    }));
  };

  return { form, setForm, step, setStep, submitting, setSubmitting, error, setError, update, addTag, removeTag, mergeParsedProfile, mergeSocialData };
}
