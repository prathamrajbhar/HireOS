import type { TestCaseInput } from './coding-executor.types';

export interface RawTestCase {
  name?: string;
  description?: string;
  input?: unknown;
  args?: unknown[];
  expected?: unknown;
  expectedOutput?: unknown;
  hidden?: boolean;
}

export interface NormalizationOptions {
  defaultHidden?: boolean;
  paramCount?: number;
}

/**
 * Parses named function arguments like `nums = [2, 7], target = 9` or `s = "()[]{}"`
 * into an ordered array of argument values without using eval.
 */
function tryParseNamedArgs(inputStr: string): unknown[] | null {
  const parts = inputStr.split(/,\s*(?=[a-zA-Z_]\w*\s*=)/);
  if (parts.length > 0 && parts.every((p) => /^[a-zA-Z_]\w*\s*=/.test(p.trim()))) {
    const extractedArgs: unknown[] = [];
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return null;
      const valStr = part.slice(eqIdx + 1).trim();
      try {
        extractedArgs.push(JSON.parse(valStr));
      } catch {
        // Strip outer quotes if single-quoted
        if (
          (valStr.startsWith("'") && valStr.endsWith("'")) ||
          (valStr.startsWith('"') && valStr.endsWith('"'))
        ) {
          extractedArgs.push(valStr.slice(1, -1));
        } else {
          extractedArgs.push(valStr);
        }
      }
    }
    return extractedArgs;
  }
  return null;
}

/**
 * Normalizes a single raw test-case record into a strictly-typed TestCaseInput.
 */
export function normalizeTestCase(
  raw: unknown,
  index: number = 0,
  options: NormalizationOptions = {}
): TestCaseInput {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Test case at index ${index} is invalid: expected an object, received ${typeof raw}.`);
  }

  const tc = raw as RawTestCase;

  // 1. Resolve name
  const name =
    (typeof tc.name === 'string' && tc.name.trim()) ||
    (typeof tc.description === 'string' && tc.description.trim()) ||
    `Case ${index + 1}`;

  // 2. Resolve hidden flag
  const hidden = typeof tc.hidden === 'boolean' ? tc.hidden : Boolean(options.defaultHidden);

  // 3. Resolve expected output
  let expected: unknown;
  if ('expected' in tc && tc.expected !== undefined) {
    expected = tc.expected;
  } else if ('expectedOutput' in tc && tc.expectedOutput !== undefined) {
    expected = tc.expectedOutput;
  } else {
    throw new Error(`Test case "${name}" is malformed: missing required "expected" or "expectedOutput" field.`);
  }

  // 4. Resolve arguments
  let args: unknown[];
  if ('args' in tc && Array.isArray(tc.args)) {
    // Already normalized format: { name, args: [...], expected }
    args = tc.args;
  } else if ('input' in tc && tc.input !== undefined) {
    const rawInput = tc.input;
    if (Array.isArray(rawInput)) {
      // Stored format: { input: [arg1, arg2], expected }
      args = rawInput;
    } else if (typeof rawInput === 'string') {
      const trimmed = rawInput.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          args = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          args = [trimmed];
        }
      } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          args = [parsed];
        } catch {
          args = [trimmed];
        }
      } else {
        const namedArgs = tryParseNamedArgs(trimmed);
        if (namedArgs !== null) {
          args = namedArgs;
        } else {
          args = [rawInput];
        }
      }
    } else {
      // Primitive or object passed directly as single argument
      args = [rawInput];
    }
  } else if ('args' in tc && tc.args !== undefined) {
    throw new Error(`Test case "${name}" has invalid "args" field: expected an array, received ${typeof tc.args}.`);
  } else {
    throw new Error(`Test case "${name}" is malformed: missing both "args" and "input" fields.`);
  }

  // 5. Optional parameter count validation
  if (options.paramCount !== undefined && args.length !== options.paramCount) {
    throw new Error(
      `Test case "${name}" argument count mismatch: expected ${options.paramCount} argument(s), but received ${args.length}.`
    );
  }

  return {
    name,
    args,
    expected,
    hidden,
  };
}

/**
 * Normalizes an array of raw test cases, preserving public/hidden flags
 * and converting stored database structures into executable TestCaseInput arrays.
 */
export function normalizeTestCases(
  rawList: unknown,
  options: NormalizationOptions = {}
): TestCaseInput[] {
  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList.map((item, idx) => normalizeTestCase(item, idx, options));
}
