import type {
  TestCaseInput,
  TestExecutionResult,
  ExecutionSummary,
  SubprocessExecutionResult,
} from './coding-executor.types';
import { compareOutputs } from './coding-executor.types';
import { executePythonSubprocess, executeNodeSubprocess } from './coding-languages.service';
import { prepareCompiledRunner, type CompiledRunner } from './coding-compiled.service';
import { normalizeTestCases } from './test-case-normalizer';

export * from './coding-executor.types';
export * from './test-case-normalizer';

const RUNNER_VERSION = '2.1.0-async-sandbox';

const PYTHON_ALIASES = new Set(['python', 'py', 'python3']);
const JAVASCRIPT_ALIASES = new Set(['javascript', 'js']);
const TYPESCRIPT_ALIASES = new Set(['typescript', 'ts']);
const CPP_ALIASES = new Set(['cpp', 'c++']);
const COMPILE_BUDGET_CAP_MS = 20_000;

export const SUPPORTED_LANGUAGES = [
  ...PYTHON_ALIASES,
  ...JAVASCRIPT_ALIASES,
  ...TYPESCRIPT_ALIASES,
  ...CPP_ALIASES,
  'java',
];

async function runInterpretedCase(
  language: string,
  code: string,
  entryPoint: string,
  args: unknown[],
  timeoutMs: number
): Promise<SubprocessExecutionResult> {
  if (PYTHON_ALIASES.has(language)) return executePythonSubprocess(code, entryPoint, args, timeoutMs);
  const isTs = TYPESCRIPT_ALIASES.has(language);
  return executeNodeSubprocess(code, entryPoint, args, timeoutMs, isTs);
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

  if (!SUPPORTED_LANGUAGES.includes(normalizedLang)) {
    return {
      results: [],
      passRate: 0,
      passRateRatio: 0,
      allPassed: false,
      totalTimeMs: 0,
      logs: [...logs, `[Execution Error] Unsupported language '${language}'. Supported: python, javascript, typescript, java, cpp.`],
      runnerVersion: RUNNER_VERSION,
    };
  }

  const safeTestCases = normalizeTestCases(testCases);
  const results: TestExecutionResult[] = [];
  let passedCount = 0;
  let totalTimeMs = 0;
  const overallStartNs = process.hrtime.bigint();
  let deadlineExceeded = false;

  // Compiled languages are built once; each test case then only pays for process start-up.
  let compiled: CompiledRunner | null = null;
  let buildFailure: { error: string; timedOut?: boolean } | null = null;
  const isCompiled = CPP_ALIASES.has(normalizedLang) || normalizedLang === 'java';
  if (isCompiled && safeTestCases.length > 0) {
    const compileBudgetMs = Math.min(COMPILE_BUDGET_CAP_MS, maxExecutionTimeMs);
    const prepared = await prepareCompiledRunner(
      normalizedLang === 'java' ? 'java' : 'cpp',
      code,
      entryPoint,
      safeTestCases,
      compileBudgetMs
    );
    if ('runner' in prepared) compiled = prepared.runner;
    else buildFailure = prepared;
  }
  const buildElapsedMs = Number(process.hrtime.bigint() - overallStartNs) / 1_000_000;

  try {
  for (let index = 0; index < safeTestCases.length; index++) {
    const testCase = safeTestCases[index];
    const testCaseName = testCase.name || `Case ${index + 1}`;
    const args = Array.isArray(testCase.args) ? testCase.args : [];

    if (buildFailure) {
      results.push({
        name: testCaseName,
        args: testCase.args,
        expected: testCase.expected,
        actual: buildFailure.error,
        status: buildFailure.timedOut ? 'timed_out' : 'error',
        timeMs: 0,
        errorMessage: buildFailure.error,
        hidden: Boolean(testCase.hidden),
      });
      continue;
    }

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
      executionResult = compiled
        ? await compiled.run(index, testTimeoutMs)
        : await runInterpretedCase(normalizedLang, code, entryPoint, args, testTimeoutMs);
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

  } finally {
    compiled?.dispose();
  }

  const passRateRatio = safeTestCases.length > 0 ? passedCount / safeTestCases.length : 0;
  const passRate = Math.round(passRateRatio * 100);
  const allPassed = safeTestCases.length > 0 && passedCount === safeTestCases.length;

  if (deadlineExceeded) {
    logs.push(`[Execution Timed Out] Overall execution deadline of ${(maxExecutionTimeMs / 1000).toFixed(1)}s exceeded.`);
  }
  if (isCompiled) logs.push(`[Build] ${buildFailure ? 'failed' : 'ok'} in ${buildElapsedMs.toFixed(0)}ms`);
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
