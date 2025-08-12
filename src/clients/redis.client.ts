import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;
  const url = process.env['REDIS_URL'];
  if (url) {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    return redisClient;
  }

  // Alternative explicit configuration (no fallbacks): require host/port/password
  const host = process.env['REDIS_HOST'];
  const portStr = process.env['REDIS_PORT'];
  const password = process.env['REDIS_PASSWORD'];
  const username = process.env['REDIS_USERNAME']; // some providers require 'default'
  const useTls = (process.env['REDIS_TLS'] || '').toLowerCase() === 'true';

  if (!host || !portStr || !password) {
    throw new Error('Missing required Redis configuration. Provide REDIS_URL or REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (and optionally REDIS_USERNAME, REDIS_TLS).');
  }

  const port = Number(portStr);
  if (!Number.isFinite(port)) {
    throw new Error('Invalid REDIS_PORT: must be a number');
  }

  const opts: any = {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };
  if (username) opts.username = username;
  if (useTls) opts.tls = {};
  redisClient = new Redis(opts);
  return redisClient;
}


