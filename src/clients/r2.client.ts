import { S3Client } from '@aws-sdk/client-s3';

export function createR2Client(): S3Client {
  const endpoint = process.env['R2_ENDPOINT']
    || (process.env['R2_ACCOUNT_ID'] ? `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com` : undefined);
  const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 configuration. Require R2_ENDPOINT or R2_ACCOUNT_ID, and R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}


