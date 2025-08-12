import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;
  const url = process.env['REDIS_URL'];
  if (!url) {
    throw new Error('Missing required environment variable: REDIS_URL');
  }
  redisClient = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  return redisClient;
}


