import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

let s3: S3Client | null = null;

function getClient(): S3Client {
  if (s3) return s3;
  s3 = new S3Client({
    endpoint: requireEnv('B2_ENDPOINT'),
    region: requireEnv('B2_REGION'),
    credentials: {
      accessKeyId: requireEnv('B2_KEY_ID'),
      secretAccessKey: requireEnv('B2_APP_KEY'),
    },
    // AWS SDK v3 defaults send CRC32 checksums B2 rejects
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return s3;
}

function getBucket(): string {
  return requireEnv('B2_BUCKET');
}

export function resumeKey(userId: string, profileId: string, fileName: string): string {
  const safe = fileName.replace(/\.pdf$/i, '');
  return `resumes/${userId}/${profileId}/${safe}.pdf`;
}

export async function uploadResume(key: string, body: Buffer): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: 'application/pdf',
    })
  );
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${key.split('/').pop() ?? 'resume.pdf'}"`,
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}

export async function downloadResume(key: string): Promise<Buffer> {
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key })
  );
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
