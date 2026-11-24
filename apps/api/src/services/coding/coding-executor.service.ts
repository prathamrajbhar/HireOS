import type {
  TestCaseInput,
  TestExecutionResult,
  ExecutionSummary,
  SubprocessExecutionResult,
} from './coding-executor.types';
import { compareOutputs } from './coding-executor.types';
import {
  executePythonSubprocess,
  executeNodeSubprocess,
  executeCppSubprocess,
  executeJavaSubprocess,
} from './coding-languages.service';
import { normalizeTestCases } from './test-case-normalizer';

export * from './coding-executor.types';
export * from './test-case-normalizer';

const RUNNER_VERSION = '2.1.0-async-sandbox';

async function runSubprocess(
  normalizedLang: string,
  code: string,
  entryPoint: string,
  args: unknown[],
  timeoutMs: number = 3000
): Promise<SubprocessExecutionResult> {
  if (normalizedLang === 'python' || normalizedLang === 'py' || normalizedLang === 'python3') {
    return await executePythonSubprocess(code, entryPoint, args, timeoutMs);
  }
  if (normalizedLang === 'javascript' || normalizedLang === 'typescript' || normalizedLang === 'js' || normalizedLang === 'ts') {
    return await executeNodeSubprocess(code, entryPoint, args, timeoutMs);
  }
  if (normalizedLang === 'cpp' || normalizedLang === 'c++') {
    return await executeCppSubprocess(code, entryPoint, args, timeoutMs);
  }
  if (normalizedLang === 'java') {
    return await executeJavaSubprocess(code, entryPoint, args, timeoutMs);
  }
  return await executePythonSubprocess(code, entryPoint, args, timeoutMs);
}

export async function executeCodingSubmission(
  code: string,
  language: string,
  testCases: TestCaseInput[] | unknown[],
  entryPoint: string = 'solution',
  maxExecutionTimeMs: number = 30_000
): Promise<ExecutionSummary> {
  const normalizedLang = (language || 'python').toLowerCase();
  const logs: string[] = [
    `[Unified Sandbox ${RUNNER_VERSION}] Target: ${normalizedLang.toUpperCase()} | Entry Point: ${entryPoint}`,
    `[Isolation & Caps] Per-Case Limit: 3.0s | Overall Budget: ${(maxExecutionTimeMs / 1000).toFixed(1)}s | Process Tree Termination: Enabled | Environment Sanitized: Yes`,
  ];

  if (!code || !code.trim()) {
    return {
      results: [],
      passRate: 0,
      passRateRatio: 0,
      allPassed: false,
      totalTimeMs: 0,
      logs: [...logs, '[Execution Error] Empty code payload provided.'],
      runnerVersion: RUNNER_VERSION,
    };
  }

  const safeTestCases = normalizeTestCases(testCases);
  const results: TestExecutionResult[] = [];
  let passedCount = 0;
  let totalTimeMs = 0;
  const overallStartNs = process.hrtime.bigint();
  let deadlineExceeded = false;

  for (let index = 0; index < safeTestCases.length; index++) {
    const testCase = safeTestCases[index];
    const testCaseName = testCase.name || `Case ${index + 1}`;
    const args = Array.isArray(testCase.args) ? testCase.args : [];

    // Check if overall execution deadline has already expired before starting the test case
    const currentOverallElapsedMs = Number(process.hrtime.bigint() - overallStartNs) / 1_000_000;
    const remainingOverallMs = maxExecutionTimeMs - currentOverallElapsedMs;

    if (remainingOverallMs <= 0 || deadlineExceeded) {
      deadlineExceeded = true;
      // Stop launching further test cases when the overall deadline is reached
      results.push({
        name: testCaseName,
        args: testCase.args,
        expected: testCase.expected,
        actual: 'None',
        status: 'timed_out',
        timeMs: 0,
        errorMessage: `Overall execution deadline reached (${(maxExecutionTimeMs / 1000).toFixed(1)}s limit)`,
        hidden: Boolean(testCase.hidden),
      });
      continue;
    }

    // Limit individual subprocess timeout to the lesser of 3000ms or remaining overall budget
    const testTimeoutMs = Math.min(3000, Math.floor(remainingOverallMs));
    if (testTimeoutMs <= 0) {
      deadlineExceeded = true;
      results.push({
        name: testCaseName,
        args: testCase.args,
        expected: testCase.expected,
        actual: 'None',
        status: 'timed_out',
        timeMs: 0,
        errorMessage: `Overall execution deadline reached (${(maxExecutionTimeMs / 1000).toFixed(1)}s limit)`,
        hidden: Boolean(testCase.hidden),
      });
      continue;
    }

    const startNs = process.hrtime.bigint();
    let executionResult: SubprocessExecutionResult;

    try {
      executionResult = await runSubprocess(normalizedLang, code, entryPoint, args, testTimeoutMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution error';
      executionResult = { actual: null, error: message };
    }

    const elapsedNs = process.hrtime.bigint() - startNs;
    const elapsedMs = Number(elapsedNs) / 1_000_000;
    totalTimeMs += elapsedMs;

    let status: 'passed' | 'failed' | 'error' | 'timed_out' = 'failed';
    if (executionResult.timedOut) {
      status = 'timed_out';
      const afterTestOverallMs = Number(process.hrtime.bigint() - overallStartNs) / 1_000_000;
      if (afterTestOverallMs >= maxExecutionTimeMs) {
        deadlineExceeded = true;
      }
    } else if (executionResult.error) {
      status = 'error';
    } else if (compareOutputs(executionResult.actual, testCase.expected)) {
      status = 'passed';
      passedCount++;
    }

    results.push({
      name: testCaseName,
      args: testCase.args,
      expected: testCase.expected,
      actual: executionResult.actual ?? executionResult.error ?? 'None',
      status,
      timeMs: Number(elapsedMs.toFixed(2)),
      errorMessage: executionResult.error,
      hidden: Boolean(testCase.hidden),
    });
  }

  const passRateRatio = safeTestCases.length > 0 ? passedCount / safeTestCases.length : 0;
  const passRate = Math.round(passRateRatio * 100);
  const allPassed = safeTestCases.length > 0 && passedCount === safeTestCases.length;

  if (deadlineExceeded) {
    logs.push(`[Execution Timed Out] Overall execution deadline of ${(maxExecutionTimeMs / 1000).toFixed(1)}s exceeded.`);
  }
  logs.push(`[Execution Complete] ${passedCount}/${safeTestCases.length} test cases passed (${passRate}%).`);

  return {
    results,
    passRate,
    passRateRatio,
    allPassed,
    totalTimeMs: Number(totalTimeMs.toFixed(2)),
    logs,
    runnerVersion: RUNNER_VERSION,
  };
}
