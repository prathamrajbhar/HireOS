import { prisma } from '@nextround/database';

export interface ScoreContract {
  passRatePercent: number;
  passRateRatio: number;
  score: number;
}

export async function updateApplicationCodingScore(
  applicationId: string,
  passRatePercent: number,
  attemptNumber?: number,
  txClient?: any
): Promise<ScoreContract> {
  const db = txClient || prisma;
  const passRateRatio = Math.max(0, Math.min(1, passRatePercent / 100));

  // If inside a transaction, acquire a transaction-scoped advisory lock on the application score
  // to strictly serialize concurrent attempt finalizations across separate worker processes.
  if (txClient && typeof txClient.$queryRawUnsafe === 'function') {
    await txClient.$queryRawUnsafe(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      `score_${applicationId}`
    );
  }

  // Prevent out-of-order overwrite if a newer attempt has already evaluated or finalized
  if (typeof attemptNumber === 'number') {
    const newerCompleted = await db.codingSubmission.findFirst({
      where: {
        application_id: applicationId,
        status: { in: ['passed', 'failed'] },
        attempt_number: { gt: attemptNumber },
      },
      select: { attempt_number: true, pass_rate: true },
      orderBy: { attempt_number: 'desc' },
    });

    if (newerCompleted) {
      // Newer submission score exists; preserve the newer score and do not overwrite evaluation
      return {
        passRatePercent: newerCompleted.pass_rate,
        passRateRatio: Math.max(0, Math.min(1, newerCompleted.pass_rate / 100)),
        score: newerCompleted.pass_rate,
      };
    }
  }

  await db.evaluation.upsert({
    where: { application_id: applicationId },
    update: {
      coding_score: passRatePercent,
      stage: 'assessment_completed',
      reasoning: `Coding assessment evaluated: ${passRatePercent}% pass rate (${passRateRatio.toFixed(2)} ratio). Pending human review.`,
    },
    create: {
      application_id: applicationId,
      stage: 'assessment_completed',
      coding_score: passRatePercent,
      reasoning: `Coding assessment evaluated: ${passRatePercent}% pass rate (${passRateRatio.toFixed(2)} ratio). Pending human review.`,
    },
  });

  return {
    passRatePercent,
    passRateRatio,
    score: passRatePercent,
  };
}
