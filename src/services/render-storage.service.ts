import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';

export type R2UploadConfig = {
  bucket: string;
  publicBase?: string; // optional CDN/public base to build returned URL
  prefix?: string; // key prefix, e.g. 'renders/'
};

export async function uploadFileToR2(
  client: S3Client,
  filePath: string,
  key: string,
  cfg: R2UploadConfig,
): Promise<string> {
  const body = fs.createReadStream(filePath);
  const contentType = 'video/mp4';

  // Normalize bucket (trim leading/trailing slashes)
  const bucketName = String(cfg.bucket || '').replace(/^\/+|\/+$/g, '');

  await client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: undefined, // R2 ignores ACL; set bucket policy/public access as needed
  }));

  const publicBase = cfg.publicBase || process.env['R2_PUBLIC_BASE'];
  if (publicBase) {
    const base = publicBase.replace(/\/$/, '');
    // If using the default R2 public domain, the bucket name must be part of the path
    try {
      const u = new URL(base);
      const isR2Public = /\.r2\.dev$/i.test(u.hostname);
      const hasBucketInPath = u.pathname.split('/').filter(Boolean)[0] === bucketName;
      if (isR2Public && !hasBucketInPath) {
        return `${base}/${bucketName}/${key}`;
      }
    } catch {
      // If URL parsing fails, fall through to simple join
    }
    return `${base}/${key}`;
  }
  // Fallback to R2 public bucket URL pattern if configured via endpoint
  const endpoint = process.env['R2_PUBLIC_ENDPOINT'] || process.env['R2_ENDPOINT'];
  if (endpoint) {
    const e = endpoint.replace(/\/$/, '');
    return `${e}/${bucketName}/${key}`;
  }
  // Last resort: return just the key
  return key;
}

export function buildRenderObjectKey(projectId: string, filename?: string, prefix?: string): string {
  const safePrefix = (prefix || process.env['R2_PREFIX'] || 'renders/').replace(/^\//, '').replace(/\/$/, '') + '/';
  const ts = Date.now();
  const base = filename && filename.endsWith('.mp4') ? filename : `${projectId}-${ts}.mp4`;
  return path.posix.join(safePrefix, projectId, base);
}


