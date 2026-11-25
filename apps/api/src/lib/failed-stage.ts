export type FailedStage = 'screening' | 'assessment' | 'interview' | 'hr_round' | 'decision';

// Evaluation.stage values written by the pipeline services, mapped to the candidate-facing stage.
const FAILED_STAGE_BY_EVAL_STAGE: Record<string, FailedStage> = {
  screening: 'screening',
  assessment: 'assessment',
  coding: 'assessment',
  assessment_completed: 'assessment',
  interview: 'interview',
  hr_round: 'hr_round',
  final_evaluation: 'decision',
  final_review: 'decision',
};

export function resolveFailedStage(
  status: unknown,
  hrRoundStatus: unknown,
  evalStage: unknown
): FailedStage | undefined {
  if (status !== 'rejected') return undefined;
  if (hrRoundStatus === 'failed') return 'hr_round';
  return typeof evalStage === 'string' ? FAILED_STAGE_BY_EVAL_STAGE[evalStage] : undefined;
}
