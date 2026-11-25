import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  application: { findUnique: vi.fn(), update: vi.fn() },
  evaluation: { upsert: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
}));
vi.mock('@nextround/database', () => ({ prisma: prismaMock }));

import { disqualifyFromAssessment } from '../services/application/application-disqualification.service';

const appRow = (status: string, userId = 'u1') => ({ id: 'a1', status, candidate: { user_id: userId } });

describe('disqualifyFromAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.application.update.mockResolvedValue({ status: 'rejected' });
    prismaMock.evaluation.upsert.mockResolvedValue({});
  });

  it('rejects an application still in the assessment stage and records an assessment-stage rejection', async () => {
    prismaMock.application.findUnique.mockResolvedValue(appRow('screening_completed'));
    await expect(disqualifyFromAssessment('a1', 'u1')).resolves.toEqual({ status: 'rejected' });
    expect(prismaMock.application.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'rejected' } });
    expect(prismaMock.evaluation.upsert.mock.calls[0][0].update).toMatchObject({ stage: 'assessment', decision: 'reject' });
  });

  it.each(['interview_scheduled', 'hr_round', 'offered', 'rejected'])('leaves a %s application untouched', async (status) => {
    prismaMock.application.findUnique.mockResolvedValue(appRow(status));
    await expect(disqualifyFromAssessment('a1', 'u1')).resolves.toEqual({ status });
    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });

  it('refuses another candidate and unknown applications', async () => {
    prismaMock.application.findUnique.mockResolvedValue(appRow('assessment', 'someone-else'));
    await expect(disqualifyFromAssessment('a1', 'u1')).rejects.toThrow();
    prismaMock.application.findUnique.mockResolvedValue(null);
    await expect(disqualifyFromAssessment('a1', 'u1')).rejects.toThrow();
    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });
});
