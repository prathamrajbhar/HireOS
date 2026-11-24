import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

const isLocalStorage =
  process.env.STORAGE_DRIVER === 'local' ||
  !process.env.AWS_ENDPOINT_URL ||
  process.env.AWS_ENDPOINT_URL.includes('localhost') ||
  process.env.AWS_ENDPOINT_URL.includes('127.0.0.1');

const primaryUploadsDir = path.resolve(__dirname, '../../uploads');
const fallbackUploadsDir = path.resolve(__dirname, '../../../../uploads');
const cwdUploadsDir = path.resolve(process.cwd(), 'uploads');
const cwdAppsApiUploadsDir = path.resolve(process.cwd(), 'apps/api/uploads');

const targetDirs = Array.from(new Set([primaryUploadsDir, fallbackUploadsDir, cwdUploadsDir, cwdAppsApiUploadsDir]));
for (const d of targetDirs) {
  try {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  } catch {
    // ignore
  }
}

const endpoint = process.env.AWS_ENDPOINT_URL || undefined;
const region = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'test';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'test';
const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'nextroundbucket';

const s3Client = new S3Client({
  ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function normalizeKey(key: string): string {
  return key.replace(/\\/g, '/').replace(/^\/+/, '');
}

let bucketEnsured = false;
export async function ensureBucket(): Promise<void> {
  if (isLocalStorage || bucketEnsured) return;
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    bucketEnsured = true;
  } catch (err: unknown) {
    const errorName = (err as { name?: string })?.name;
    const statusCode = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (errorName === 'NotFound' || errorName === 'NoSuchBucket' || statusCode === 404) {
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
        logger.child('Storage').info(`Successfully verified and created missing S3 bucket: ${bucket}`);
        bucketEnsured = true;
      } catch (createErr) {
        logger.child('Storage').warn(`Could not create bucket ${bucket}:`, createErr);
      }
    } else {
      bucketEnsured = true;
    }
  }
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType?: string
): Promise<string> {
  const normalizedKey = normalizeKey(key);

  if (isLocalStorage) {
    for (const d of targetDirs) {
      try {
        const filePath = path.join(d, normalizedKey);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await fs.promises.writeFile(filePath, body);
      } catch {
        // ignore secondary target failure
      }
    }
    const appUrl = (process.env.API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
    return `${appUrl}/uploads/${normalizedKey}`;
  }

  await ensureBucket();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
      Body: body,
      ContentType: contentType,
    })
  );

  if (endpoint) {
    const cleanEndpoint = endpoint.replace(/\/+$/, '');
    return `${cleanEndpoint}/${bucket}/${normalizedKey}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedKey}`;
}

export async function getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  let normalizedKey = normalizeKey(key);
  if (normalizedKey.startsWith('http://') || normalizedKey.startsWith('https://')) {
    try {
      const parsed = new URL(normalizedKey);
      if (parsed.pathname.startsWith('/uploads/')) {
        return normalizedKey;
      }
      const pathParts = parsed.pathname.replace(/^\/+/, '').split('/');
      if (pathParts.length > 1 && pathParts[0] === bucket) {
        normalizedKey = pathParts.slice(1).join('/');
      } else {
        normalizedKey = pathParts.join('/');
      }
    } catch {
      return normalizedKey;
    }
  }

  if (isLocalStorage) {
    const appUrl = (process.env.API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/api\/v1\/?$/, '');
    return `${appUrl}/uploads/${normalizedKey}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function deleteFile(key: string): Promise<void> {
  const normalizedKey = normalizeKey(key);

  if (isLocalStorage) {
    for (const d of targetDirs) {
      try {
        const filePath = path.join(d, normalizedKey);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
    return;
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: normalizedKey,
      })
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.child('Storage').error(`Failed to delete file "${key}" from S3:`, message);
  }
}

