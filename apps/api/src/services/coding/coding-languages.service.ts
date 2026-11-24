import type { SubprocessExecutionResult } from './coding-executor.types';
import { executeCppSubprocess, executeJavaSubprocess } from './coding-compiled.service';
import { spawnAsyncWithTreeTermination } from './process-manager';

export { executeCppSubprocess, executeJavaSubprocess };

export async function executePythonSubprocess(
  code: string,
  entryPoint: string,
  args: unknown[],
  timeoutMs: number = 3000
): Promise<SubprocessExecutionResult> {
  if (timeoutMs <= 0) {
    return {
      actual: null,
      timedOut: true,
      error: 'Python execution budget exhausted before launch',
    };
  }

  const runnerScript = `
import sys, json

payload = json.loads(sys.stdin.read())
code_str = payload["code"]
entry_fn = payload["entryPoint"]
fn_args = payload["args"]

scope = {}
try:
    exec(code_str, scope)
    fn = scope.get(entry_fn) or globals().get(entry_fn)
    if not fn:
        for val in scope.values():
            if callable(val) and not getattr(val, "__name__", "").startswith("_"):
                fn = val
                break

    if not fn:
        print(json.dumps({"error": f"Entry point function '{entry_fn}' not found in candidate code."}))
        sys.exit(0)

    res = fn(*fn_args)
    print(json.dumps({"result": res}))
except Exception as e:
    print(json.dumps({"error": f"{type(e).__name__}: {str(e)}"}))
`;

  try {
    const inputJson = JSON.stringify({ code, entryPoint, args });
    const executionTimeout = timeoutMs;

    let result = await spawnAsyncWithTreeTermination('python3', ['-c', runnerScript], {
      input: inputJson,
      timeoutMs: executionTimeout,
    });

    if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
      result = await spawnAsyncWithTreeTermination('python', ['-c', runnerScript], {
        input: inputJson,
        timeoutMs: executionTimeout,
      });
    }

    if (result.timedOut) {
      return {
        actual: null,
        timedOut: true,
        error: `Python process timed out (${(executionTimeout / 1000).toFixed(1)}s limit)`,
      };
    }

    if (result.error) {
      return { actual: null, error: `Process error: ${result.error.message}` };
    }

    if (result.stdout) {
      const lines = result.stdout.trim().split('\n');
      const lastLine = lines.pop() || '{}';
      try {
        const parsed = JSON.parse(lastLine) as { error?: string; result?: unknown };
        if (parsed.error) return { actual: null, error: parsed.error };
        return { actual: parsed.result };
      } catch (err) {
        return { actual: null, error: `Output parsing failed: ${result.stdout}` };
      }
    }

    return { actual: null, error: result.stderr ? result.stderr.trim() : 'Python process execution failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Python execution failed';
    return { actual: null, error: message };
  }
}

export async function executeNodeSubprocess(
  code: string,
  entryPoint: string,
  args: unknown[],
  timeoutMs: number = 3000
): Promise<SubprocessExecutionResult> {
  if (timeoutMs <= 0) {
    return {
      actual: null,
      timedOut: true,
      error: 'Node execution budget exhausted before launch',
    };
  }

  const runnerScript = `
const fs = require('fs');

let rawPayload = '';
process.stdin.on('data', chunk => { rawPayload += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(rawPayload);
    const codeStr = payload.code;
    const entryFn = payload.entryPoint;
    const fnArgs = payload.args;

    const cleanCode = codeStr
      .replace(/((?:const|let|var)\\s+[a-zA-Z0-9_]+)\\s*:\\s*[a-zA-Z0-9_<>\\[\\]\\s,|&{}]+(?=\\s*=)/g, '$1')
      .replace(/([a-zA-Z0-9_]+)\\s*:\\s*[a-zA-Z0-9_<>\\[\\]\\s,|&{}]+(?=[,\\)])/g, '$1')
      .replace(/\\)\\s*:\\s*[a-zA-Z0-9_<>\\[\\]\\s,|&{}]+(?=\\s*\\{)/g, ')')
      .replace(/\\s+as\\s+[a-zA-Z0-9_<>\\[\\]]+/g, '');

    const exports = {};
    const module = { exports };
    const fnWrapper = new Function('exports', 'module', 'require', cleanCode + '\\nreturn typeof ' + entryFn + ' !== "undefined" ? ' + entryFn + ' : (module.exports.' + entryFn + ' || module.exports);');
    const fn = fnWrapper(exports, module, require);

    if (typeof fn !== 'function') {
      console.log(JSON.stringify({ error: "Entry point function '" + entryFn + "' not found." }));
      process.exit(0);
    }

    const result = fn(...fnArgs);
    console.log(JSON.stringify({ result }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.name + ': ' + err.message }));
  }
});
`;

  try {
    const inputJson = JSON.stringify({ code, entryPoint, args });
    const executionTimeout = timeoutMs;

    const result = await spawnAsyncWithTreeTermination('node', ['-e', runnerScript], {
      input: inputJson,
      timeoutMs: executionTimeout,
    });

    if (result.timedOut) {
      return {
        actual: null,
        timedOut: true,
        error: `Node process timed out (${(executionTimeout / 1000).toFixed(1)}s limit)`,
      };
    }

    if (result.error) {
      return { actual: null, error: `Process error: ${result.error.message}` };
    }

    if (result.stdout) {
      const lines = result.stdout.trim().split('\n');
      const lastLine = lines.pop() || '{}';
      try {
        const parsed = JSON.parse(lastLine) as { error?: string; result?: unknown };
        if (parsed.error) return { actual: null, error: parsed.error };
        return { actual: parsed.result };
      } catch (err) {
        return { actual: null, error: `Output parsing failed: ${result.stdout}` };
      }
    }

    return { actual: null, error: result.stderr ? result.stderr.trim() : 'Node execution failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Node execution failed';
    return { actual: null, error: message };
  }
}
