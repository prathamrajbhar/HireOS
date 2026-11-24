import { describe, it, expect } from 'vitest';
import {
  normalizeTestCase,
  normalizeTestCases,
} from '../services/coding/test-case-normalizer';
import { executeCodingSubmission } from '../services/coding/coding-executor.service';

describe('Test Case Normalization Layer (Phase 2)', () => {
  describe('normalizeTestCase and normalizeTestCases', () => {
    it('1. normalizes existing stored { input, expected } format with array arguments', () => {
      const stored = {
        input: [[2, 7, 11, 15], 9],
        expected: [0, 1],
        description: 'Standard sorted pair',
      };

      const normalized = normalizeTestCase(stored, 0);
      expect(normalized.name).toBe('Standard sorted pair');
      expect(normalized.args).toEqual([[2, 7, 11, 15], 9]);
      expect(normalized.expected).toEqual([0, 1]);
      expect(normalized.hidden).toBe(false);
    });

    it('2. preserves already-normalized { name, args, expected } format', () => {
      const alreadyNormalized = {
        name: 'Case 42',
        args: [100, 'test', true],
        expected: 'ok',
        hidden: true,
      };

      const normalized = normalizeTestCase(alreadyNormalized, 0);
      expect(normalized.name).toBe('Case 42');
      expect(normalized.args).toEqual([100, 'test', true]);
      expect(normalized.expected).toBe('ok');
      expect(normalized.hidden).toBe(true);
    });

    it('3. handles string arguments correctly (both single string and array with string)', () => {
      const caseA = normalizeTestCase({ input: '()', expected: true }, 0);
      expect(caseA.args).toEqual(['()']);

      const caseB = normalizeTestCase({ input: ['()[]{}'], expected: true }, 1);
      expect(caseB.args).toEqual(['()[]{}']);
    });

    it('4. handles numeric, boolean, and null arguments correctly', () => {
      const numCase = normalizeTestCase({ input: 42, expected: 84 }, 0);
      expect(numCase.args).toEqual([42]);

      const boolCase = normalizeTestCase({ input: false, expected: true }, 1);
      expect(boolCase.args).toEqual([false]);

      const nullCase = normalizeTestCase({ input: null, expected: null }, 2);
      expect(nullCase.args).toEqual([null]);
    });

    it('5. handles multiple arguments correctly', () => {
      const multi = normalizeTestCase(
        {
          input: ['prefix', [1, 2, 3], { key: 'val' }, 99],
          expected: 'done',
        },
        0
      );
      expect(multi.args).toEqual(['prefix', [1, 2, 3], { key: 'val' }, 99]);
      expect(multi.args).toHaveLength(4);
    });

    it('6. handles nested arrays and objects correctly', () => {
      const nestedIntervals = {
        input: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
      };

      const normalized = normalizeTestCase(nestedIntervals, 0);
      expect(normalized.args).toEqual([[[1, 3], [2, 6], [8, 10], [15, 18]]]);
      expect(normalized.args[0]).toEqual([[1, 3], [2, 6], [8, 10], [15, 18]]);
    });

    it('7. handles empty argument lists when genuinely valid', () => {
      const emptyArgs = normalizeTestCase({ args: [], expected: 0 }, 0);
      expect(emptyArgs.args).toEqual([]);

      const emptyInput = normalizeTestCase({ input: [], expected: 'empty' }, 1);
      expect(emptyInput.args).toEqual([]);
    });

    it('8. rejects invalid or malformed input with descriptive errors', () => {
      // Non-object
      expect(() => normalizeTestCase('not-an-object', 0)).toThrow(
        'expected an object'
      );

      // Missing expected field
      expect(() => normalizeTestCase({ input: [1, 2] }, 0)).toThrow(
        'missing required "expected"'
      );

      // Missing both args and input
      expect(() => normalizeTestCase({ expected: 10 }, 0)).toThrow(
        'missing both "args" and "input"'
      );

      // Invalid args type (not an array)
      expect(() => normalizeTestCase({ args: 'not-array', expected: 10 }, 0)).toThrow(
        'invalid "args" field: expected an array'
      );
    });

    it('parses named arguments without eval (e.g. s = "()[]{}")', () => {
      const namedCase = normalizeTestCase(
        {
          input: 's = "()[]{}"',
          expected: true,
        },
        0
      );
      expect(namedCase.args).toEqual(['()[]{}']);

      const namedMulti = normalizeTestCase(
        {
          input: 'nums = [2, 7, 11, 15], target = 9',
          expected: [0, 1],
        },
        1
      );
      expect(namedMulti.args).toEqual([[2, 7, 11, 15], 9]);
    });
  });

  describe('End-to-End Execution with Normalized Test Cases', () => {
    it('9. correct Python solution passes public test cases with normalized stored format', async () => {
      // Stored format for Valid Parentheses from seed:
      const rawStoredTests = [
        { input: ['()'], expected: true, description: 'Simple' },
        { input: ['()[]{}'], expected: true, description: 'Multiple' },
        { input: ['(]'], expected: false, description: 'Mismatch' },
      ];

      const validPythonCode = `
def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return len(stack) == 0
`;

      const normalizedTests = normalizeTestCases(rawStoredTests);
      const summary = await executeCodingSubmission(validPythonCode, 'python', normalizedTests, 'is_valid');

      expect(summary.allPassed).toBe(true);
      expect(summary.passRate).toBe(100);
      expect(summary.results).toHaveLength(3);
      expect(summary.results.every((r) => r.status === 'passed')).toBe(true);
      expect(summary.results[0].args).toEqual(['()']);
    });

    it('10. incorrect solution fails test cases accurately with actual returned output', async () => {
      const rawStoredTests = [
        { input: ['()'], expected: true },
        { input: ['(]'], expected: false },
      ];

      const brokenCode = `
def is_valid(s: str) -> bool:
    return False
`;

      const normalizedTests = normalizeTestCases(rawStoredTests);
      const summary = await executeCodingSubmission(brokenCode, 'python', normalizedTests, 'is_valid');

      expect(summary.allPassed).toBe(false);
      expect(summary.passRate).toBe(50);
      expect(summary.results[0].status).toBe('failed');
      expect(summary.results[0].actual).toBe(false);
      expect(summary.results[1].status).toBe('passed');
    });

    it('11. executes multi-argument functions correctly (Two Sum in JS)', async () => {
      const rawStoredTests = [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
        { input: [[3, 2, 4], 6], expected: [1, 2] },
      ];

      const twoSumJs = `
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) return [map.get(comp), i];
    map.set(nums[i], i);
  }
  return [];
}
`;

      const normalizedTests = normalizeTestCases(rawStoredTests);
      const summary = await executeCodingSubmission(twoSumJs, 'javascript', normalizedTests, 'twoSum');

      expect(summary.allPassed).toBe(true);
      expect(summary.passRate).toBe(100);
      expect(summary.results[0].args).toEqual([[2, 7, 11, 15], 9]);
    });

    it('12. preserves hidden flag and supports masking for candidate response', async () => {
      const publicTests = normalizeTestCases(
        [{ input: ['()'], expected: true, description: 'Public 1' }],
        { defaultHidden: false }
      );
      const hiddenTests = normalizeTestCases(
        [{ input: ['{[]}'], expected: true, description: 'Hidden 1' }],
        { defaultHidden: true }
      );

      const combined = [...publicTests, ...hiddenTests];
      expect(combined[0].hidden).toBe(false);
      expect(combined[1].hidden).toBe(true);

      const code = `
def is_valid(s: str) -> bool:
    return True
`;
      const summary = await executeCodingSubmission(code, 'python', combined, 'is_valid');
      expect(summary.results[0].hidden).toBe(false);
      expect(summary.results[1].hidden).toBe(true);

      // Verify masking pattern:
      const candidateView = summary.results.map((res) => ({
        name: res.name,
        input: res.hidden ? '[Hidden Test Case]' : JSON.stringify(res.args),
        expected: res.hidden ? '[Hidden]' : JSON.stringify(res.expected),
        actual: res.hidden ? (res.status === 'passed' ? '[Hidden - Passed]' : '[Hidden - Failed]') : JSON.stringify(res.actual),
        status: res.status,
      }));

      expect(candidateView[0].input).toBe('["()"]');
      expect(candidateView[1].input).toBe('[Hidden Test Case]');
      expect(candidateView[1].expected).toBe('[Hidden]');
    });
  });
});
