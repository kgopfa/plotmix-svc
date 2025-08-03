import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '3000', 10),
  jwt: {
    secret: process.env['JWT_SECRET'] || 'fallback-secret-key',
    expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  },
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10),
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },
  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
  },
} as const;

export type Config = typeof config; 