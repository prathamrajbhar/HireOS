import { prisma } from '@nextround/database';
import { forbidden, notFound } from '../../lib/http-errors';
import { PAST_ASSESSMENT } from '../../lib/pipeline';

const DISQUALIFICATION_REASON =
  'Disqualified during the online assessment after repeated proctoring violations.';

/**
 * Records a proctoring disqualification raised during the aptitude/coding rounds.
 * Idempotent: an application already past the assessment stage (or rejected) is left untouched.
 */
export async function disqualifyFromAssessment(applicationId: string, userId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: { select: { user_id: true } } },
  });
  if (!application) throw notFound('Application not found');
  if (application.candidate.user_id !== userId) throw forbidden('Forbidden: Access denied');

  if (PAST_ASSESSMENT.includes(application.status)) {
    return { status: application.status };
  }

  const [updated] = await prisma.$transaction([
    prisma.application.update({ where: { id: applicationId }, data: { status: 'rejected' } }),
    prisma.evaluation.upsert({
      where: { application_id: applicationId },
      create: {
        application_id: applicationId,
        stage: 'assessment',
        decision: 'reject',
        reasoning: DISQUALIFICATION_REASON,
      },
      update: { stage: 'assessment', decision: 'reject', reasoning: DISQUALIFICATION_REASON },
    }),
  ]);

  return { status: updated.status };
}
