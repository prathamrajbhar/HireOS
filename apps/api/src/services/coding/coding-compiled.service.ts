import fs from 'fs';
import path from 'path';
import os from 'os';
import type { SubprocessExecutionResult, TestCaseInput } from './coding-executor.types';
import { spawnAsyncWithTreeTermination } from './process-manager';
import {
  parseMarkedResult,
  HarnessError,
  buildCppProgram,
  buildJavaMain,
  candidateMethodNames,
  findSignature,
} from './coding-harness';

export type CompiledLanguage = 'cpp' | 'java';

export interface CompiledRunner {
  /** Runs one test case (by index) of the already-compiled program. */
  run(index: number, timeoutMs: number): Promise<SubprocessExecutionResult>;
  dispose(): void;
}

export type PrepareResult =
  | { runner: CompiledRunner }
  | { error: string; timedOut?: boolean };

function firstLines(text: string, count = 3): string {
  return text.split('\n').filter((l) => l.trim()).slice(0, count).join('\n') || 'Build failed';
}

/**
 * Compiles the candidate's solution together with a generated harness once, so every test case
 * only pays for process start-up. Compile budget is separate from the per-case run budget.
 */
export async function prepareCompiledRunner(
  language: CompiledLanguage,
  code: string,
  entryPoint: string,
  testCases: TestCaseInput[],
  compileBudgetMs: number
): Promise<PrepareResult> {
  const label = language === 'cpp' ? 'C++' : 'Java';
  if (compileBudgetMs <= 0) {
    return { error: `${label} execution budget exhausted before launch`, timedOut: true };
  }

  let sources: { files: Record<string, string>; compile: [string, string[]]; run: (dir: string, i: number) => [string, string[]] };
  try {
    const sig = findSignature(code, language, candidateMethodNames(entryPoint));
    const cases = testCases.map((tc) => ({ name: tc.name, args: tc.args }));
    if (language === 'cpp') {
      sources = {
        files: { 'solution.cpp': buildCppProgram(code, sig, cases) },
        compile: ['g++', ['-O2', '-std=c++17', 'solution.cpp', '-o', 'solution']],
        run: (dir, i) => [path.join(dir, 'solution'), [String(i)]],
      };
    } else {
      sources = {
        files: { 'Solution.java': code, 'Main.java': buildJavaMain(sig, cases) },
        compile: ['javac', ['-encoding', 'UTF-8', '-nowarn', 'Solution.java', 'Main.java']],
        run: (dir, i) => ['java', ['-Xss64m', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-cp', dir, 'Main', String(i)]],
      };
    }
  } catch (error) {
    if (error instanceof HarnessError) return { error: `CompileError: ${error.message}` };
    throw error;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `nextround-${language}-`));
  const dispose = () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };

  try {
    for (const [name, content] of Object.entries(sources.files)) {
      fs.writeFileSync(path.join(tmpDir, name), content, 'utf-8');
    }

    const [compileCmd, compileArgs] = sources.compile;
    const compile = await spawnAsyncWithTreeTermination(compileCmd, compileArgs, {
      cwd: tmpDir,
      timeoutMs: compileBudgetMs,
    });

    if (compile.timedOut) {
      dispose();
      return { error: `${label} compilation timed out`, timedOut: true };
    }
    if (compile.error) {
      dispose();
      const missing = (compile.error as NodeJS.ErrnoException).code === 'ENOENT';
      return {
        error: missing
          ? `${label} toolchain (${compileCmd}) is not installed on the execution server.`
          : `CompileError: ${compile.error.message}`,
      };
    }
    if (compile.exitCode !== 0) {
      dispose();
      return { error: `CompileError: ${firstLines(compile.stderr || compile.stdout)}` };
    }
  } catch (error) {
    dispose();
    return { error: error instanceof Error ? error.message : `${label} compilation failed` };
  }

  const runner: CompiledRunner = {
    async run(index, timeoutMs) {
      if (timeoutMs <= 0) {
        return { actual: null, timedOut: true, error: `${label} execution budget exhausted before launch` };
      }
      const [cmd, args] = sources.run(tmpDir, index);
      const proc = await spawnAsyncWithTreeTermination(cmd, args, { cwd: tmpDir, timeoutMs });
      if (proc.timedOut) {
        return { actual: null, timedOut: true, error: `${label} process timed out (${(timeoutMs / 1000).toFixed(1)}s limit)` };
      }
      if (proc.error) return { actual: null, error: `Process error: ${proc.error.message}` };

      const marked = parseMarkedResult(proc.stdout);
      if (marked) return marked;

      const detail = firstLines(proc.stderr, 4);
      return {
        actual: null,
        error:
          proc.exitCode === 0
            ? 'Solution did not return a value.'
            : `RuntimeError (exit ${proc.exitCode}): ${proc.stderr.trim() ? detail : 'process crashed'}`,
      };
    },
    dispose,
  };
  return { runner };
}
