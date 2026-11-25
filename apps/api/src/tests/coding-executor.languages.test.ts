import { execFileSync } from 'child_process';
import { describe, expect, it } from 'vitest';
import { executeCodingSubmission } from '../services/coding/coding-executor.service';
import { findSignature, candidateMethodNames, javaLiteral, parseJavaType } from '../services/coding/coding-harness';
import { DEMO_SOLUTIONS as SOLUTIONS, type DemoLanguage as Lang } from '../data/demo-solutions';

const has = (cmd: string, arg = '--version') => {
  try {
    execFileSync(cmd, [arg], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const AVAILABLE: Record<Lang, boolean> = {
  python: has('python3'),
  javascript: has('node'),
  typescript: has('node'),
  java: has('javac', '-version') && has('java', '-version'),
  cpp: has('g++'),
};
const LANGS = Object.keys(AVAILABLE) as Lang[];

const ENTRY: Record<string, string> = {
  'two-sum': 'two_sum',
  'valid-parentheses': 'is_valid',
  'max-subarray': 'max_sub_array',
  'container-with-most-water': 'max_area',
  'longest-substring-without-repeating': 'length_of_longest_substring',
  'search-in-rotated-sorted-array': 'search',
  'merge-intervals': 'merge',
  'reverse-linked-list': 'reverse_list',
};

const CASES: Record<string, { input: unknown[]; expected: unknown }[]> = {
  'two-sum': [
    { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { input: [[3, 2, 4], 6], expected: [1, 2] },
    { input: [[1000000, -999999, 0, 5], 1], expected: [0, 1] },
  ],
  'valid-parentheses': [
    { input: ['()[]{}'], expected: true },
    { input: ['(]'], expected: false },
    { input: ['a"b\\'], expected: false },
  ],
  'max-subarray': [
    { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
    { input: [[1]], expected: 1 },
  ],
  'container-with-most-water': [
    { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49 },
    { input: [[1, 1]], expected: 1 },
  ],
  'longest-substring-without-repeating': [
    { input: ['abcabcbb'], expected: 3 },
    { input: [''], expected: 0 },
  ],
  'search-in-rotated-sorted-array': [
    { input: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
    { input: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
  ],
  'merge-intervals': [
    { input: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
    { input: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
  ],
  'reverse-linked-list': [
    { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
    { input: [[]], expected: [] },
  ],
};

const run = (code: string, lang: string, slug: string) =>
  executeCodingSubmission(code, lang, CASES[slug], ENTRY[slug], 60_000);

describe('correct solutions pass in every language', () => {
  for (const slug of Object.keys(SOLUTIONS)) {
    for (const lang of LANGS) {
      it.runIf(AVAILABLE[lang])(`${slug} [${lang}]`, async () => {
        const summary = await run(SOLUTIONS[slug][lang], lang, slug);
        expect(summary.results.map((r) => r.errorMessage ?? r.status)).toEqual(
          summary.results.map(() => 'passed')
        );
        expect(summary.allPassed).toBe(true);
        expect(summary.passRate).toBe(100);
      }, 60_000);
    }
  }
});

describe('wrong, broken and hostile solutions', () => {
  it.each(LANGS.filter((l) => AVAILABLE[l]))('a wrong answer is failed, not errored [%s]', async (lang) => {
    const wrong: Record<Lang, string> = {
      python: 'def max_sub_array(nums):\n    return 0',
      javascript: 'function maxSubArray(nums) { return 0; }',
      typescript: 'function maxSubArray(nums: number[]): number { return 0; }',
      java: 'class Solution { public int maxSubArray(int[] nums) { return 0; } }',
      cpp: '#include <vector>\nusing namespace std;\nclass Solution { public: int maxSubArray(vector<int>& nums) { return 0; } };',
    };
    const summary = await run(wrong[lang], lang, 'max-subarray');
    expect(summary.allPassed).toBe(false);
    expect(summary.results.every((r) => r.status === 'failed')).toBe(true);
  }, 60_000);

  it.each(['java', 'cpp'] as const)('compile errors are reported as errors with a message [%s]', async (lang) => {
    if (!AVAILABLE[lang]) return;
    const broken =
      lang === 'java'
        ? 'class Solution { public int maxSubArray(int[] nums) { return x; } }'
        : '#include <vector>\nusing namespace std;\nclass Solution { public: int maxSubArray(vector<int>& nums) { return x; } };';
    const summary = await run(broken, lang, 'max-subarray');
    expect(summary.passRate).toBe(0);
    expect(summary.results[0].status).toBe('error');
    expect(summary.results[0].errorMessage).toMatch(/CompileError/);
  }, 60_000);

  it('Python runtime exceptions are errors with the exception name', async () => {
    if (!AVAILABLE.python) return;
    const summary = await run('def max_sub_array(nums):\n    return nums[99]', 'python', 'max-subarray');
    expect(summary.results[0].status).toBe('error');
    expect(summary.results[0].errorMessage).toContain('IndexError');
  });

  it('print statements do not corrupt results [python/javascript]', async () => {
    const py = await run('def max_sub_array(nums):\n    print("debug", nums, end="")\n    return max(nums) if all(n < 0 for n in nums) else sum(n for n in nums if n > 0) and 6 if len(nums) > 1 else 1', 'python', 'max-subarray');
    expect(py.results.every((r) => r.status === 'passed')).toBe(true);

    const js = await run('function maxSubArray(nums) { console.log("debug"); process.stdout.write("noise"); return nums.length > 1 ? 6 : 1; }', 'javascript', 'max-subarray');
    expect(js.results.every((r) => r.status === 'passed')).toBe(true);
  });

  it('infinite loops time out in every language', async () => {
    const loops: Partial<Record<Lang, string>> = {
      python: 'def max_sub_array(nums):\n    while True: pass',
      javascript: 'function maxSubArray(nums) { while (true) {} }',
      java: 'class Solution { public int maxSubArray(int[] nums) { while (true) {} } }',
      cpp: '#include <vector>\nusing namespace std;\nclass Solution { public: int maxSubArray(vector<int>& nums) { while (true) {} } };',
    };
    for (const lang of Object.keys(loops) as Lang[]) {
      if (!AVAILABLE[lang]) continue;
      const summary = await executeCodingSubmission(
        loops[lang]!, lang, [CASES['max-subarray'][1]], ENTRY['max-subarray'], 60_000
      );
      expect(summary.results[0].status, lang).toBe('timed_out');
    }
  }, 60_000);

  it('JavaScript/Python accept camelCase and snake_case spellings of the entry point', async () => {
    const py = await run('def maxSubArray(nums):\n    return 6 if len(nums) > 1 else 1', 'python', 'max-subarray');
    expect(py.allPassed).toBe(true);
    const js = await run('const max_sub_array = (nums) => (nums.length > 1 ? 6 : 1);', 'javascript', 'max-subarray');
    expect(js.allPassed).toBe(true);
  });

  it('reports a clear error when the entry point is missing or the language is unsupported', async () => {
    const missing = await run('function other() {}\nfunction another() {}', 'javascript', 'max-subarray');
    expect(missing.results[0].errorMessage).toMatch(/not found/);

    const unsupported = await executeCodingSubmission('x', 'brainfuck', CASES['max-subarray'], 'x');
    expect(unsupported.allPassed).toBe(false);
    expect(unsupported.logs.join('\n')).toMatch(/Unsupported language/);
  });
});

describe('harness signature parsing', () => {
  it('finds methods across access modifiers and parameter styles', () => {
    const java = findSignature(
      'import java.util.*;\npublic class Solution {\n  public static List<Integer> go(int[] a, String s) { return null; }\n}',
      'java',
      ['go']
    );
    expect(java.owner).toBe('Solution');
    expect(java.params.map((p) => p.name)).toEqual(['a', 's']);

    const cpp = findSignature(
      'class Solution {\npublic:\n  vector<vector<int>> merge(vector<vector<int>> &intervals) {\n    return {};\n  }\n};',
      'cpp',
      ['merge']
    );
    expect(cpp.returnType).toBe('vector<vector<int>>');
    expect(cpp.params[0].name).toBe('intervals');
  });

  it('derives method name variants and rejects mismatched inputs', () => {
    expect(candidateMethodNames('two_sum')).toEqual(['two_sum', 'twoSum']);
    expect(() => javaLiteral(parseJavaType('int[]'), 'not-an-array')).toThrow(/expected an array/);
    expect(() => javaLiteral(parseJavaType('int'), 2 ** 40)).toThrow(/does not fit/);
  });
});
