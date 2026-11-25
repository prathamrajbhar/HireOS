/**
 * Known-correct reference solutions in every supported language, keyed by problem slug.
 * Verified against every test case by tests/coding-executor.languages.test.ts.
 * Served only by the demo-only "AI solve" endpoint (see DEMO_AI_SOLVE).
 */
export type DemoLanguage = 'python' | 'javascript' | 'typescript' | 'java' | 'cpp';

export const DEMO_LANGUAGES: DemoLanguage[] = ['python', 'javascript', 'typescript', 'java', 'cpp'];

export const DEMO_SOLUTIONS: Record<string, Record<DemoLanguage, string>> = {
  'two-sum': {
    python: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []`,
    javascript: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    typescript: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}`,
    java: `import java.util.*;
class Solution {
  public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
      if (seen.containsKey(target - nums[i])) return new int[]{seen.get(target - nums[i]), i};
      seen.put(nums[i], i);
    }
    return new int[]{};
  }
}`,
    cpp: `#include <vector>
#include <unordered_map>
using namespace std;
class Solution {
public:
  vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < (int) nums.size(); i++) {
      auto it = seen.find(target - nums[i]);
      if (it != seen.end()) return {it->second, i};
      seen[nums[i]] = i;
    }
    return {};
  }
};`,
  },
  'valid-parentheses': {
    python: `def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in s:
        if c in pairs:
            if not stack or stack.pop() != pairs[c]:
                return False
        else:
            stack.append(c)
    return not stack`,
    javascript: `function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (pairs[c]) { if (stack.pop() !== pairs[c]) return false; } else stack.push(c);
  }
  return stack.length === 0;
}`,
    typescript: `function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  for (const c of s) {
    if (pairs[c]) { if (stack.pop() !== pairs[c]) return false; } else stack.push(c);
  }
  return stack.length === 0;
}`,
    java: `import java.util.*;
class Solution {
  public boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
      if (c == '(' || c == '[' || c == '{') stack.push(c);
      else {
        if (stack.isEmpty()) return false;
        char o = stack.pop();
        if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
      }
    }
    return stack.isEmpty();
  }
}`,
    cpp: `#include <string>
#include <stack>
using namespace std;
class Solution {
public:
  bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
      if (c == '(' || c == '[' || c == '{') st.push(c);
      else {
        if (st.empty()) return false;
        char o = st.top(); st.pop();
        if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
      }
    }
    return st.empty();
  }
};`,
  },
  'max-subarray': {
    python: `def max_sub_array(nums):
    best = cur = nums[0]
    for n in nums[1:]:
        cur = max(n, cur + n)
        best = max(best, cur)
    return best`,
    javascript: `function maxSubArray(nums) {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }
  return best;
}`,
    typescript: `function maxSubArray(nums: number[]): number {
  let best: number = nums[0], cur: number = nums[0];
  for (let i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }
  return best;
}`,
    java: `class Solution {
  public int maxSubArray(int[] nums) {
    int best = nums[0], cur = nums[0];
    for (int i = 1; i < nums.length; i++) { cur = Math.max(nums[i], cur + nums[i]); best = Math.max(best, cur); }
    return best;
  }
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
  int maxSubArray(vector<int>& nums) {
    int best = nums[0], cur = nums[0];
    for (size_t i = 1; i < nums.size(); i++) { cur = max(nums[i], cur + nums[i]); best = max(best, cur); }
    return best;
  }
};`,
  },
  'container-with-most-water': {
    python: `def max_area(height):
    l, r, best = 0, len(height) - 1, 0
    while l < r:
        best = max(best, min(height[l], height[r]) * (r - l))
        if height[l] < height[r]: l += 1
        else: r -= 1
    return best`,
    javascript: `function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++; else r--;
  }
  return best;
}`,
    typescript: `function maxArea(height: number[]): number {
  let l = 0, r = height.length - 1, best = 0;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l++; else r--;
  }
  return best;
}`,
    java: `class Solution {
  public int maxArea(int[] height) {
    int l = 0, r = height.length - 1, best = 0;
    while (l < r) {
      best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
      if (height[l] < height[r]) l++; else r--;
    }
    return best;
  }
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
  int maxArea(vector<int>& height) {
    int l = 0, r = (int) height.size() - 1, best = 0;
    while (l < r) {
      best = max(best, min(height[l], height[r]) * (r - l));
      if (height[l] < height[r]) l++; else r--;
    }
    return best;
  }
};`,
  },
  'longest-substring-without-repeating': {
    python: `def length_of_longest_substring(s):
    last, start, best = {}, 0, 0
    for i, c in enumerate(s):
        if c in last and last[c] >= start:
            start = last[c] + 1
        last[c] = i
        best = max(best, i - start + 1)
    return best`,
    javascript: `function lengthOfLongestSubstring(s) {
  const last = new Map();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
    last.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}`,
    typescript: `function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let start = 0, best = 0;
  for (let i = 0; i < s.length; i++) {
    const prev = last.get(s[i]);
    if (prev !== undefined && prev >= start) start = prev + 1;
    last.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}`,
    java: `import java.util.*;
class Solution {
  public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int start = 0, best = 0;
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (last.containsKey(c) && last.get(c) >= start) start = last.get(c) + 1;
      last.put(c, i);
      best = Math.max(best, i - start + 1);
    }
    return best;
  }
}`,
    cpp: `#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;
class Solution {
public:
  int lengthOfLongestSubstring(string s) {
    unordered_map<char, int> last;
    int start = 0, best = 0;
    for (int i = 0; i < (int) s.size(); i++) {
      auto it = last.find(s[i]);
      if (it != last.end() && it->second >= start) start = it->second + 1;
      last[s[i]] = i;
      best = max(best, i - start + 1);
    }
    return best;
  }
};`,
  },
  'search-in-rotated-sorted-array': {
    python: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target: return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]: hi = mid - 1
            else: lo = mid + 1
        else:
            if nums[mid] < target <= nums[hi]: lo = mid + 1
            else: hi = mid - 1
    return -1`,
    javascript: `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
    }
  }
  return -1;
}`,
    typescript: `function search(nums: number[], target: number): number {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
    }
  }
  return -1;
}`,
    java: `class Solution {
  public int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
      int mid = (lo + hi) / 2;
      if (nums[mid] == target) return mid;
      if (nums[lo] <= nums[mid]) {
        if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
      } else {
        if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
      }
    }
    return -1;
  }
}`,
    cpp: `#include <vector>
using namespace std;
class Solution {
public:
  int search(vector<int>& nums, int target) {
    int lo = 0, hi = (int) nums.size() - 1;
    while (lo <= hi) {
      int mid = (lo + hi) / 2;
      if (nums[mid] == target) return mid;
      if (nums[lo] <= nums[mid]) {
        if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; else lo = mid + 1;
      } else {
        if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; else hi = mid - 1;
      }
    }
    return -1;
  }
};`,
  },
  'merge-intervals': {
    python: `def merge(intervals):
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out`,
    javascript: `function merge(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
    else out.push([s, e]);
  }
  return out;
}`,
    typescript: `function merge(intervals: number[][]): number[][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out: number[][] = [];
  for (const [s, e] of sorted) {
    if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
    else out.push([s, e]);
  }
  return out;
}`,
    java: `import java.util.*;
class Solution {
  public int[][] merge(int[][] intervals) {
    int[][] sorted = intervals.clone();
    Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> out = new ArrayList<>();
    for (int[] iv : sorted) {
      if (!out.isEmpty() && iv[0] <= out.get(out.size() - 1)[1]) out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], iv[1]);
      else out.add(new int[]{iv[0], iv[1]});
    }
    return out.toArray(new int[0][]);
  }
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
  vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> out;
    for (auto& iv : intervals) {
      if (!out.empty() && iv[0] <= out.back()[1]) out.back()[1] = max(out.back()[1], iv[1]);
      else out.push_back({iv[0], iv[1]});
    }
    return out;
  }
};`,
  },
  'reverse-linked-list': {
    python: `def reverse_list(head):
    return head[::-1]`,
    javascript: `function reverseList(head) {
  return [...head].reverse();
}`,
    typescript: `function reverseList(head: number[]): number[] {
  return [...head].reverse();
}`,
    java: `class Solution {
  public int[] reverseList(int[] head) {
    int[] out = new int[head.length];
    for (int i = 0; i < head.length; i++) out[i] = head[head.length - 1 - i];
    return out;
  }
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;
class Solution {
public:
  vector<int> reverseList(vector<int>& head) {
    vector<int> out(head.rbegin(), head.rend());
    return out;
  }
};`,
  },
};
