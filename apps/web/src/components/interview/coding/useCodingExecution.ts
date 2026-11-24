import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import type { CodingProblem, SupportedLanguage } from './useCodingProblem';
import type { TestResult, CodingRunResponse, CodingSubmitResponse } from './types';

interface UseCodingExecutionOptions {
  problem: CodingProblem | null;
  applicationId?: string;
  sessionId?: string;
}

export function useCodingExecution({ problem, applicationId, sessionId }: UseCodingExecutionOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [complexityFeedback, setComplexityFeedback] = useState<string | null>(null);
  const [finalPassRate, setFinalPassRate] = useState(0);

  const runCode = async (
    code: string,
    language: SupportedLanguage,
    onFinish: () => void
  ) => {
    if (!problem || isRunning) return;
    setIsRunning(true);
    setOutputLogs(['Running test cases against Python sandbox environment...']);
    setTestResults([]);

    try {
      const res = await apiClient.post<CodingRunResponse>(
        `/coding/run`,
        {
          code,
          language,
          problemId: problem.id,
          applicationId,
          sessionId,
        }
      );

      const stdoutStderr = res?.stdout_stderr;
      setOutputLogs([
        stdoutStderr
          ? `=== Sandbox Output ===\n${stdoutStderr}`
          : 'Code executed with no stdout/stderr output.',
      ]);
      setTestResults(Array.isArray(res?.test_results) ? res.test_results : []);
      onFinish();
    } catch (err: unknown) {
      setOutputLogs([`[Runtime Sandbox Error] ${(err as Error)?.message || 'Execution failed'}`]);
      onFinish();
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async (
    code: string,
    language: SupportedLanguage,
    onSuccess: () => void
  ) => {
    if (!problem || isRunning) return;
    setIsRunning(true);
    setOutputLogs(['Submitting final solution for pipeline score grading...']);

    try {
      const res = await apiClient.post<CodingSubmitResponse>(`/coding/submit`, {
        code,
        language,
        problemId: problem.id,
        applicationId,
        sessionId,
      });

      if (!res) {
        throw new Error('Received empty response from server.');
      }

      setTestResults(Array.isArray(res.test_results) ? res.test_results : []);
      setFinalPassRate(typeof res.pass_rate_percent === 'number' ? res.pass_rate_percent : 0);
      setComplexityFeedback(res.ai_feedback || res.complexity || 'O(N) Optimization evaluated.');
      setSubmitted(true);
      onSuccess();
    } catch (err: unknown) {
      setOutputLogs([`[Submission Error] ${(err as Error)?.message || 'Failed to submit solution'}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    submitted,
    setSubmitted,
    outputLogs,
    testResults,
    complexityFeedback,
    finalPassRate,
    runCode,
    submitSolution,
  };
}
