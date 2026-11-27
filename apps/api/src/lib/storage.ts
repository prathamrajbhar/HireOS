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

const endpoint = process.env.AWS_ENDPOINT_URL || undefined;
const region = process.env.AWS_DEFAULT_REGION || process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'nextroundbucket';

// All files live in S3 (or an S3-compatible service via AWS_ENDPOINT_URL). There is no local-disk mode.
const s3Client = new S3Client({
  ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  region,
  ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
});

function assertS3Configured(): void {
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 storage is not configured: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (and AWS_S3_BUCKET).');
  }
}

function decodeKeySegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizeKey(key: string): string {
  return key.replace(/\\/g, '/').replace(/^\/+/, '');
}

let bucketEnsured = false;
export async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
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

  assertS3Configured();
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
      // URL pathnames are percent-encoded (e.g. a space becomes %20); the S3 key is not.
      const pathParts = parsed.pathname.replace(/^\/+/, '').split('/').map(decodeKeySegment);
      if (pathParts.length > 1 && pathParts[0] === bucket) {
        normalizedKey = pathParts.slice(1).join('/');
      } else {
        normalizedKey = pathParts.join('/');
      }
    } catch {
      return normalizedKey;
    }
  }

  assertS3Configured();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function deleteFile(key: string): Promise<void> {
  const normalizedKey = normalizeKey(key);

  assertS3Configured();
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

