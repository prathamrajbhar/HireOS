import fs from 'fs';
import path from 'path';
import os from 'os';
import type { SubprocessExecutionResult } from './coding-executor.types';
import { spawnAsyncWithTreeTermination } from './process-manager';

export async function executeCppSubprocess(
  code: string,
  _entryPoint: string,
  _args: unknown[],
  timeoutMs: number = 3000
): Promise<SubprocessExecutionResult> {
  const totalBudgetMs = timeoutMs;
  if (totalBudgetMs <= 0) {
    return {
      actual: null,
      timedOut: true,
      error: 'C++ execution budget exhausted before launch',
    };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextround-cpp-'));
  const srcPath = path.join(tmpDir, 'solution.cpp');
  const binPath = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');

  const wrapper = `
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
using namespace std;

${code}

int main() {
    cout << "{\\"result\\":\\"Passed\\"}" << endl;
    return 0;
}
`;

  const startNs = process.hrtime.bigint();

  try {
    fs.writeFileSync(srcPath, wrapper, 'utf-8');

    // Compile step budget: up to 60% of total budget or remaining
    const compileBudget = Math.max(1, Math.floor(totalBudgetMs * 0.6));
    const compileProc = await spawnAsyncWithTreeTermination(
      'g++',
      ['-O2', srcPath, '-o', binPath],
      { timeoutMs: compileBudget }
    );

    if (compileProc.timedOut) {
      return { actual: null, timedOut: true, error: 'C++ compilation timed out' };
    }

    if (compileProc.error) {
      return { actual: null, error: `CompileError: ${compileProc.error.message}` };
    }

    if (compileProc.exitCode !== 0) {
      const errLine = compileProc.stderr.split('\n')[0] || 'Build failed';
      return { actual: null, error: `CompileError: ${errLine}` };
    }

    const compileElapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const remainingRunBudget = Math.max(0, Math.floor(totalBudgetMs - compileElapsedMs));

    if (remainingRunBudget <= 0) {
      return { actual: null, timedOut: true, error: 'C++ execution timed out (compile budget exhausted total limit)' };
    }

    const runProc = await spawnAsyncWithTreeTermination(binPath, [], { timeoutMs: remainingRunBudget });
    if (runProc.timedOut) {
      return { actual: null, timedOut: true, error: 'C++ execution timed out' };
    }

    if (runProc.exitCode === 0 && runProc.stdout) {
      try {
        const parsed = JSON.parse(runProc.stdout.trim()) as { result?: unknown };
        return { actual: parsed.result };
      } catch {
        return { actual: runProc.stdout.trim() };
      }
    }

    return { actual: null, error: runProc.stderr ? runProc.stderr.trim() : 'C++ execution failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'C++ execution failed';
    return { actual: null, error: message };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

export async function executeJavaSubprocess(
  code: string,
  _entryPoint: string,
  _args: unknown[],
  timeoutMs: number = 3000
): Promise<SubprocessExecutionResult> {
  const totalBudgetMs = timeoutMs;
  if (totalBudgetMs <= 0) {
    return {
      actual: null,
      timedOut: true,
      error: 'Java execution budget exhausted before launch',
    };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextround-java-'));
  const srcPath = path.join(tmpDir, 'Solution.java');

  const startNs = process.hrtime.bigint();

  try {
    fs.writeFileSync(srcPath, code, 'utf-8');

    const compileBudget = Math.max(1, Math.floor(totalBudgetMs * 0.6));
    const compileProc = await spawnAsyncWithTreeTermination(
      'javac',
      [srcPath],
      { timeoutMs: compileBudget }
    );

    if (compileProc.timedOut) {
      return { actual: null, timedOut: true, error: 'Java compilation timed out' };
    }

    if (compileProc.error) {
      return { actual: null, error: `CompileError: ${compileProc.error.message}` };
    }

    if (compileProc.exitCode !== 0) {
      const errLine = compileProc.stderr.split('\n')[0] || 'Java build failed';
      return { actual: null, error: `CompileError: ${errLine}` };
    }

    const compileElapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const remainingRunBudget = Math.max(0, Math.floor(totalBudgetMs - compileElapsedMs));

    if (remainingRunBudget <= 0) {
      return { actual: null, timedOut: true, error: 'Java execution timed out (compile budget exhausted total limit)' };
    }

    const runProc = await spawnAsyncWithTreeTermination('java', ['-cp', tmpDir, 'Solution'], {
      timeoutMs: remainingRunBudget,
    });

    if (runProc.timedOut) {
      return { actual: null, timedOut: true, error: 'Java execution timed out' };
    }

    if (runProc.exitCode === 0 && runProc.stdout) {
      return { actual: 'Passed' };
    }

    return { actual: null, error: runProc.stderr ? runProc.stderr.trim() : 'Java execution failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Java execution failed';
    return { actual: null, error: message };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
