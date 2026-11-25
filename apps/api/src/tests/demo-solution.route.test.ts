import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ role: 'candidate', slug: 'two-sum' as string | null }));

vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', role: state.role };
    next();
  },
}));
vi.mock('@nextround/database', () => ({
  prisma: {
    codingProblem: { findUnique: vi.fn(async () => (state.slug ? { slug: state.slug } : null)) },
  },
  Prisma: {},
}));
vi.mock('../services/submission/submission-queue.service', () => ({ enqueueSubmissionExecution: vi.fn() }));
vi.mock('../services/questions/question-bank.service', () => ({ selectCodingProblem: vi.fn() }));
vi.mock('../services/scoring/scoring.service', () => ({ updateApplicationCodingScore: vi.fn() }));
vi.mock('../services/application/application-coding.service', () => ({
  verifyApplicationAccess: vi.fn(),
  verifyMockSessionAccess: vi.fn(),
}));

import { codingRouter } from '../routes/coding/coding.routes';
import fs from 'fs';
import path from 'path';
import { DEMO_SOLUTIONS, DEMO_LANGUAGES } from '../data/demo-solutions';
import { executeCodingSubmission } from '../services/coding/coding-executor.service';

let server: Server;
let base: string;
const get = (path: string) => fetch(`${base}/coding${path}`).then(async (r) => ({ status: r.status, body: await r.json() }));

beforeAll(async () => {
  const app = express();
  app.use('/coding', codingRouter);
  await new Promise<void>((resolve) => (server = app.listen(0, resolve)));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => {
  state.role = 'candidate';
  state.slug = 'two-sum';
  delete process.env.DEMO_AI_SOLVE;
});

describe('GET /coding/problems/:id/demo-solution', () => {
  it('is enabled by default and can be switched off with DEMO_AI_SOLVE=false', async () => {
    expect((await get('/problems/p1/demo-solution?language=python')).status).toBe(200);
    process.env.DEMO_AI_SOLVE = 'false';
    expect((await get('/problems/p1/demo-solution?language=python')).status).toBe(404);
  });

  it('returns the reference solution for the problem and language', async () => {
    const res = await get('/problems/p1/demo-solution?language=Java');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ code: DEMO_SOLUTIONS['two-sum'].java, language: 'java' });
  });

  it('rejects HR users, bad languages, and unknown problems', async () => {
    state.role = 'hr';
    expect((await get('/problems/p1/demo-solution?language=python')).status).toBe(403);
    state.role = 'candidate';
    expect((await get('/problems/p1/demo-solution?language=cobol')).status).toBe(400);
    state.slug = null;
    expect((await get('/problems/p1/demo-solution?language=python')).status).toBe(404);
    state.slug = 'not-a-seeded-problem';
    expect((await get('/problems/p1/demo-solution?language=python')).status).toBe(404);
  });
});

describe('demo solutions cover every seeded problem', () => {
  const seed = fs.readFileSync(path.resolve(__dirname, '../../../../packages/database/prisma/seed.ts'), 'utf-8');
  const seededSlugs = [...seed.matchAll(/^\s{4}slug: '([^']+)'/gm)].map((m) => m[1]);

  it('has a solution in every supported language for each seeded problem', () => {
    expect(seededSlugs.length).toBeGreaterThanOrEqual(8);
    for (const slug of seededSlugs) {
      for (const lang of DEMO_LANGUAGES) {
        expect(DEMO_SOLUTIONS[slug]?.[lang], `${slug} / ${lang}`).toBeTruthy();
      }
    }
  });

  it('serves code through the route that actually solves the problem', async () => {
    state.slug = 'two-sum';
    for (const lang of ['python', 'javascript'] as const) {
      const { body } = await get(`/problems/p1/demo-solution?language=${lang}`);
      const summary = await executeCodingSubmission(
        body.data.code,
        lang,
        [
          { name: 'a', args: [[2, 7, 11, 15], 9], expected: [0, 1] },
          { name: 'b', args: [[3, 2, 4], 6], expected: [1, 2] },
        ],
        'two_sum'
      );
      expect(summary.allPassed, lang).toBe(true);
    }
  });
});

