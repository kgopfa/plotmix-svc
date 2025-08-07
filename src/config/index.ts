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

export const config = {
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
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
    origin: getOptionalEnv('CORS_ORIGIN', 'http://localhost:3000'),
  },
  logging: {
    level: getOptionalEnv('LOG_LEVEL', 'info'),
  },
} as const;

export type Config = typeof config; 