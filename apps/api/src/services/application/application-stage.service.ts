import { prisma } from '../../lib/prisma';
import type { ApplicationStatus } from '@nextround/database';
import { evaluateApplicationScreening } from '../screening/screening-evaluator.service';
import { notFound, forbidden, badRequest } from '../../lib/http-errors';
import { recordWorkflowAudit } from '../../lib/audit-log';
import type { AppUserCtx } from './application-scheduling.service';

export async function runScreening(appId: string, user: AppUserCtx) {
  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { job: true, candidate: true },
  });

  if (!application) {
    throw notFound('Application not found');
  }

  if (user.role === 'hr') {
    if (application.job.org_id !== user.orgId) {
      throw forbidden('Forbidden: Access denied to application');
    }
  } else if (user.role === 'candidate') {
    if (application.candidate.user_id !== user.userId) {
      throw forbidden('Forbidden: Access denied to application');
    }
  }

  return evaluateApplicationScreening(appId);
}

export async function overrideStatus(
  appId: string,
  orgId: string,
  body: { status: ApplicationStatus; reasoning?: string | null }
) {
  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { job: true },
  });

  if (!application) {
    throw notFound('Application not found');
  }

  if (application.job.org_id !== orgId) {
    throw forbidden('Forbidden: Access denied to application');
  }

  const updatedApp = await prisma.application.update({
    where: { id: appId },
    data: {
      status: body.status,
    },
  });

  if (body.reasoning) {
    await prisma.evaluation.upsert({
      where: { application_id: appId },
      create: {
        application_id: appId,
        stage: body.status,
        reasoning: body.reasoning,
      },
      update: {
        stage: body.status,
        reasoning: body.reasoning,
      },
    });
  }

  await recordWorkflowAudit({
    orgId,
    jobId: application.job_id,
    agentName: 'hr_user',
    action: 'hr_status_override',
    applicationId: appId,
    input: {
      previous_status: application.status,
      new_status: body.status,
      reasoning: body.reasoning ?? null,
    },
    output: { status: body.status },
  });

  return { application: updatedApp };
}

const STAGE_TO_STATUS: Record<string, ApplicationStatus> = {
  Sourced: 'applied',
  Screened: 'screening_completed',
  Assessment: 'assessment',
  Interview: 'interview_scheduled',
  'HR Round': 'hr_round',
  Panel: 'evaluation',
  Decision: 'decided',
};

const VALID_STATUSES: readonly string[] = [
  'applied',
  'screening',
  'screening_completed',
  'assessment',
  'interview_scheduled',
  'interviewed',
  'evaluation',
  'hr_round',
  'decided',
  'offered',
  'accepted',
  'rejected',
  'withdrawn',
];

export async function advanceStage(
  appId: string,
  orgId: string,
  body: { stage?: string; status?: ApplicationStatus }
) {
  const application = await prisma.application.findUnique({
    where: { id: appId },
    include: { job: true },
  });

  if (!application) {
    throw notFound('Application not found');
  }

  if (application.job.org_id !== orgId) {
    throw forbidden('Forbidden: Access denied to application');
  }

  const { stage, status } = body;

  let nextStatus: ApplicationStatus;
  if (status && VALID_STATUSES.includes(status)) {
    nextStatus = status;
  } else if (stage) {
    nextStatus = STAGE_TO_STATUS[stage] || application.status;
  } else {
    throw badRequest('Provide a stage or status to advance the candidate');
  }

  const updatedApp = await prisma.application.update({
    where: { id: appId },
    data: { status: nextStatus },
  });

  await recordWorkflowAudit({
    orgId,
    jobId: application.job_id,
    agentName: 'hr_user',
    action: 'hr_stage_advance',
    applicationId: appId,
    input: {
      previous_status: application.status,
      new_status: nextStatus,
      stage: stage ?? null,
    },
    output: { status: nextStatus },
  });

  return {
    application: {
      ...updatedApp,
      job: application.job,
    },
  };
}
