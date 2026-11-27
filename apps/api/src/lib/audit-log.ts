import { Prisma } from '@nextround/database';
import { prisma } from './prisma';
import { logger } from './logger';

export type WorkflowAuditAction =
  | 'hr_evaluation_override'
  | 'hr_status_override'
  | 'hr_stage_advance'
  | 'hr_round_decision'
  | 'hr_manual_schedule'
  | 'automated_decision';

export interface RecordWorkflowAuditInput {
  orgId?: string | null;
  jobId?: string | null;
  agentName: 'hr_user' | 'decision_agent';
  action: WorkflowAuditAction;
  applicationId: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

/**
 * Records a completed workflow audit event in AgentLog for analytics and
 * human-intervention tracking without failing the primary request if logging errors.
 */
export async function recordWorkflowAudit(event: RecordWorkflowAuditInput): Promise<void> {
  if (typeof prisma.agentLog?.create !== 'function') {
    return;
  }

  try {
    await prisma.agentLog.create({
      data: {
        org_id: event.orgId ?? null,
        job_id: event.jobId ?? null,
        agent_name: event.agentName,
        action: event.action,
        status: 'completed',
        input: {
          application_id: event.applicationId,
          ...(event.input ?? {}),
        } as Prisma.InputJsonValue,
        output: (event.output ?? Prisma.DbNull) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      },
    });
  } catch (err) {
    logger.child('AuditLog').warn(`Failed to record workflow audit ${event.action} for ${event.applicationId}:`, err);
  }
}

