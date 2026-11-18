
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
  var pgPoolGlobal: Pool | undefined;
}

const rawConnectionString =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV === 'test' || process.env.VITEST
    ? 'postgresql://postgres:postgres@localhost:5432/nextround_test'
    : '');

if (!rawConnectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}

function getPoolConfig(connectionStr: string) {
  // SSL certificate verification is enabled by default.
  // Disable it only for explicitly approved troubleshooting scenarios.
  const isExplicitNoVerify =
    connectionStr.includes('sslmode=no-verify') ||
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false';

  const isCloudOrSsl =
    connectionStr.includes('neon.tech') ||
    connectionStr.includes('rds.amazonaws.com') ||
    connectionStr.includes('sslmode=require') ||
    connectionStr.includes('sslmode=verify-ca') ||
    connectionStr.includes('sslmode=verify-full') ||
    connectionStr.includes('sslmode=prefer') ||
    isExplicitNoVerify;

  // Validate pool size; fall back to 20 for invalid values.
  const configuredPoolMax = Number(process.env.PG_POOL_MAX);
  const poolMax =
    Number.isInteger(configuredPoolMax) && configuredPoolMax > 0
      ? configuredPoolMax
      : 20;

  const commonPoolConfig = {
    max: poolMax,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
    keepAlive: true,
  };

  if (isCloudOrSsl) {
    const sslConfig = {
      rejectUnauthorized: !isExplicitNoVerify,
    };

    try {
      const url = new URL(connectionStr);

      // SSL is configured explicitly through the pg Pool options.
      url.searchParams.delete('sslmode');
      url.searchParams.delete('ssl');

      return {
        connectionString: url.toString(),
        ssl: sslConfig,
        ...commonPoolConfig,
      };
    } catch {
      return {
        connectionString: connectionStr,
        ssl: sslConfig,
        ...commonPoolConfig,
      };
    }
  }

  return {
    connectionString: connectionStr,
    ...commonPoolConfig,
  };
}

// Reuse the PostgreSQL connection pool during development.
const pool =
  globalThis.pgPoolGlobal ??
  (globalThis.pgPoolGlobal = new Pool(getPoolConfig(rawConnectionString)));

// Log unexpected errors from idle PostgreSQL clients.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Reuse the Prisma client to avoid creating duplicate instances.
export const prisma =
  globalThis.prismaGlobal ??
  (globalThis.prismaGlobal = new PrismaClient({
    adapter: new PrismaPg(pool),
  }));

export * from './generated/prisma/client';
