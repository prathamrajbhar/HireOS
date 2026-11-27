import type { SubprocessExecutionResult } from './coding-executor.types';
import { spawnAsyncWithTreeTermination } from './process-manager';
import { ERROR_MARKER, RESULT_MARKER, candidateMethodNames, parseMarkedResult } from './coding-harness';

const PYTHON_RUNNER = `
import sys, json, inspect

MARK = ${JSON.stringify(RESULT_MARKER)}
real_out = sys.stdout
sys.stdout = sys.stderr  # candidate prints must never corrupt the result channel
sys.setrecursionlimit(20000)

def _default(o):
    if isinstance(o, (set, frozenset)):
        return sorted(o)
    return str(o)

def emit(payload):
    real_out.write(MARK + json.dumps(payload, default=_default, allow_nan=False) + "\\n")
    real_out.flush()

def fail(message):
    real_out.write(MARK + json.dumps(None) + "\\n")
    real_out.write("@@NR_ERROR@@" + message + "\\n")
    real_out.flush()

payload = json.loads(sys.stdin.read())
names = payload["names"]
fn_args = payload["args"]

scope = {"__name__": "candidate_solution"}
try:
    exec(compile(payload["code"], "<candidate>", "exec"), scope)

    fn = next((scope[n] for n in names if callable(scope.get(n))), None)

    if fn is None and inspect.isclass(scope.get("Solution")):
        inst = scope["Solution"]()
        fn = next((getattr(inst, n) for n in names if callable(getattr(inst, n, None))), None)

    if fn is None:
        user_fns = [v for v in scope.values() if inspect.isfunction(v) and v.__code__.co_filename == "<candidate>"]
        if len(user_fns) == 1:
            fn = user_fns[0]

    if fn is None:
        fail("Entry point function '" + names[0] + "' not found in your code. Keep the function name from the starter code.")
    else:
        emit(fn(*fn_args))
except BaseException as e:
    fail(type(e).__name__ + ": " + str(e))
`;

const NODE_RUNNER = `
const MARK = ${JSON.stringify(RESULT_MARKER)};
let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', async () => {
  const realLog = console.log;
  console.log = console.info = console.debug = (...a) => console.error(...a);
  const out = (value, error) => {
    let line = MARK + JSON.stringify(value === undefined ? null : value) + '\\n';
    if (error) line += '@@NR_ERROR@@' + error + '\\n';
    process.stdout.write(line);
  };
  try {
    const payload = JSON.parse(raw);
    let source = payload.code;
    if (payload.typescript) {
      const mod = require('node:module');
      if (typeof mod.stripTypeScriptTypes === 'function') {
        source = mod.stripTypeScriptTypes(source, { mode: 'strip' });
      }
    }
    const names = payload.names;
    const lookups = names.map((n) => 'typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined').join(', ');
    const solutionClass = 'typeof Solution !== "undefined" ? Solution : undefined';
    const exportsObj = {};
    const moduleObj = { exports: exportsObj };
    const body = source + '\\nreturn { found: [' + lookups + '], cls: ' + solutionClass + ' };';
    const found = new Function('exports', 'module', 'require', body)(exportsObj, moduleObj, require);

    let fn = found.found.find((f) => typeof f === 'function');
    if (!fn) fn = names.map((n) => moduleObj.exports[n] || exportsObj[n]).find((f) => typeof f === 'function');
    if (!fn && typeof found.cls === 'function') {
      const inst = new found.cls();
      const m = names.find((n) => typeof inst[n] === 'function');
      if (m) fn = inst[m].bind(inst);
    }
    if (!fn) {
      out(null, "Entry point function '" + names[0] + "' not found in your code. Keep the function name from the starter code.");
      return;
    }
    out(await fn(...payload.args));
  } catch (err) {
    out(null, (err && err.name ? err.name : 'Error') + ': ' + (err && err.message ? err.message : String(err)));
  }
});
`;

function interpretMarkedOutput(stdout: string, stderr: string, label: string): SubprocessExecutionResult {
  const errAt = stdout.lastIndexOf(ERROR_MARKER);
  if (errAt !== -1) {
    const end = stdout.indexOf('\n', errAt);
    return { actual: null, error: stdout.slice(errAt + ERROR_MARKER.length, end === -1 ? undefined : end) };
  }

  const parsed = parseMarkedResult(stdout);
  if (parsed) return parsed;

  const detail = stderr.trim().split('\n').slice(-4).join('\n');
  return { actual: null, error: detail || `${label} process produced no result` };
}

async function runInterpreted(
  label: string,
  commands: string[],
  argsFor: (cmd: string) => string[],
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<SubprocessExecutionResult> {
  if (timeoutMs <= 0) {
    return { actual: null, timedOut: true, error: `${label} execution budget exhausted before launch` };
  }

  try {
    const input = JSON.stringify(payload);
    let result = await spawnAsyncWithTreeTermination(commands[0], argsFor(commands[0]), { input, timeoutMs });
    for (const fallback of commands.slice(1)) {
      if (!(result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT')) break;
      result = await spawnAsyncWithTreeTermination(fallback, argsFor(fallback), { input, timeoutMs });
    }

    if (result.timedOut) {
      return { actual: null, timedOut: true, error: `${label} process timed out (${(timeoutMs / 1000).toFixed(1)}s limit)` };
    }
    if (result.error) {
      if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { actual: null, error: `${label} runtime (${commands.join(' / ')}) is not installed on the execution server.` };
      }
      return { actual: null, error: `Process error: ${result.error.message}` };
    }
    return interpretMarkedOutput(result.stdout, result.stderr, label);
  } catch (error) {
    return { actual: null, error: error instanceof Error ? error.message : `${label} execution failed` };
  }
}

export function executePythonSubprocess(
  code: string,
  entryPoint: string,
  args: unknown[],
  timeoutMs: number = 3000
): Promise<SubprocessExecutionResult> {
  return runInterpreted('Python', ['python3', 'python'], () => ['-c', PYTHON_RUNNER], {
    code,
    names: candidateMethodNames(entryPoint),
    args,
  }, timeoutMs);
}

export function executeNodeSubprocess(
  code: string,
  entryPoint: string,
  args: unknown[],
  timeoutMs: number = 3000,
  typescript: boolean = false
): Promise<SubprocessExecutionResult> {
  return runInterpreted('Node', ['node'], () => ['-e', NODE_RUNNER], {
    code,
    names: candidateMethodNames(entryPoint),
    args,
    typescript,
  }, timeoutMs);
}
