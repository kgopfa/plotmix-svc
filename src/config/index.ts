import dotenv from 'dotenv';

dotenv.config();

// Helper function to get required environment variable
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function to get optional environment variable with fallback
function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function getRequiredIntEnv(key: string): number {
  const rawValue = getRequiredEnv(key);
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }
  return parsed;
}

function parseOrigins(value: string): string[] {
  const tokens = value
    .split(/[,;\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const normalized = tokens.map((entry) =>
    entry.endsWith('/') ? entry.slice(0, -1) : entry,
  );

  return Array.from(new Set(normalized));
}

const nodeEnvRaw = getOptionalEnv('NODE_ENV', 'development');
const normalizedNodeEnv = nodeEnvRaw.toLowerCase();
const isProduction = normalizedNodeEnv === 'production';
const nodeEnv = nodeEnvRaw;
const defaultCorsOrigin =
  isProduction
    ? 'https://www.getplotmix.com'
    : 'http://localhost:3000';

const corsOrigins = parseOrigins(
  getOptionalEnv('CORS_ORIGIN', defaultCorsOrigin),
);

export const config = {
  nodeEnv,
  port: parseInt(getOptionalEnv('PORT', '3000'), 10),
  jwt: {
    // Internal JWT secret for backend operations (should be different from NextAuth)
    secret: getRequiredEnv('JWT_SECRET'),
    expiresIn: getOptionalEnv('JWT_EXPIRES_IN', '24h'),
  },
  nextAuth: {
    // NextAuth secret for validating frontend tokens (should match frontend NEXTAUTH_SECRET)
    secret: getRequiredEnv('NEXTAUTH_SECRET'),
  },
  internal: {
    // Internal API key for secure backend-to-backend communication
    apiKey: getRequiredEnv('INTERNAL_API_KEY'),
  },
  rateLimit: {
    windowMs: parseInt(getOptionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(getOptionalEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : [defaultCorsOrigin],
  },
  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info'),
  },
  mail: {
    host: getRequiredEnv('SMTP_HOST'),
    port: getRequiredIntEnv('SMTP_PORT'),
    user: getRequiredEnv('SMTP_USER'),
    password: getRequiredEnv('SMTP_PASSWORD'),
    fromEmail: getRequiredEnv('FEEDBACK_FROM_EMAIL'),
    toEmail: getRequiredEnv('FEEDBACK_TO_EMAIL'),
  },
} as const;

export type Config = typeof config;