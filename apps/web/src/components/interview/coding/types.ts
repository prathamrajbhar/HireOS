export interface TestResult {
  name: string;
  input: string;
  expected: string;
  actual: string;
  status: 'passed' | 'failed';
  time: string;
}

export interface CodingRunResponse {
  stdout_stderr: string;
  test_results: TestResult[];
}

export interface CodingSubmitResponse {
  submissionId?: string;
  status?: string;
  test_results: TestResult[];
  pass_rate_percent: number;
  ai_feedback?: string;
  complexity?: string;
}

