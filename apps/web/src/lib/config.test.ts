import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadFlag(value?: string): Promise<boolean> {
  vi.resetModules();
  if (value === undefined) delete process.env.NEXT_PUBLIC_DEMO_AI_SOLVE;
  else process.env.NEXT_PUBLIC_DEMO_AI_SOLVE = value;
  return (await import('./config')).siteConfig.demoAiSolve;
}

describe('siteConfig.demoAiSolve', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_DEMO_AI_SOLVE;
  });

  it('is enabled by default', async () => {
    expect(await loadFlag()).toBe(true);
  });

  it('can be switched off explicitly', async () => {
    expect(await loadFlag('false')).toBe(false);
  });
});
