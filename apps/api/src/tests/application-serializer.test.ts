import { describe, it, expect } from 'vitest';
import { serializeApplication } from '../lib/serializers.application';

describe('Application Serializer - Social Links', () => {
  it('serializes full https GitHub and LinkedIn URLs', () => {
    const rawApp = {
      id: 'app-1',
      status: 'applied',
      candidate: {
        id: 'cand-1',
        name: 'Dhruvil Mevada',
        github_url: 'https://github.com/dhruvil',
        linkedin_url: 'https://linkedin.com/in/dhruvil',
        portfolio_url: 'https://dhruvil.dev',
      },
    };

    const serialized = serializeApplication(rawApp);
    expect(serialized.githubUrl).toBe('https://github.com/dhruvil');
    expect(serialized.linkedinUrl).toBe('https://linkedin.com/in/dhruvil');
    expect(serialized.portfolioUrl).toBe('https://dhruvil.dev');
  });

  it('normalizes domains without protocol', () => {
    const rawApp = {
      id: 'app-2',
      status: 'applied',
      candidate: {
        id: 'cand-2',
        name: 'Alice Smith',
        github_url: 'github.com/alicesmith',
        linkedin_url: 'www.linkedin.com/in/alicesmith',
      },
    };

    const serialized = serializeApplication(rawApp);
    expect(serialized.githubUrl).toBe('https://github.com/alicesmith');
    expect(serialized.linkedinUrl).toBe('https://www.linkedin.com/in/alicesmith');
  });

  it('normalizes handles/usernames with default domain', () => {
    const rawApp = {
      id: 'app-3',
      status: 'applied',
      candidate: {
        id: 'cand-3',
        name: 'Bob Jones',
        github_url: '@bobjones',
        linkedin_url: 'bobjones',
      },
    };

    const serialized = serializeApplication(rawApp);
    expect(serialized.githubUrl).toBe('https://github.com/bobjones');
    expect(serialized.linkedinUrl).toBe('https://linkedin.com/in/bobjones');
  });

  it('falls back to social_data or parsed_resume when direct columns are empty', () => {
    const rawApp = {
      id: 'app-4',
      status: 'applied',
      candidate: {
        id: 'cand-4',
        name: 'Charlie Brown',
        social_data: {
          github: { profileUrl: 'https://github.com/charlie' },
          linkedin: { url: 'https://linkedin.com/in/charlie' },
        },
      },
    };

    const serialized = serializeApplication(rawApp);
    expect(serialized.githubUrl).toBe('https://github.com/charlie');
    expect(serialized.linkedinUrl).toBe('https://linkedin.com/in/charlie');
  });

  it('leaves social links undefined when candidate has none', () => {
    const rawApp = {
      id: 'app-5',
      status: 'applied',
      candidate: {
        id: 'cand-5',
        name: 'Dave Miller',
      },
    };

    const serialized = serializeApplication(rawApp);
    expect(serialized.githubUrl).toBeUndefined();
    expect(serialized.linkedinUrl).toBeUndefined();
    expect(serialized.portfolioUrl).toBeUndefined();
  });
});
