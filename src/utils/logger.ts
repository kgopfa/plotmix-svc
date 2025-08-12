import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
  })
);

// JSON format for file output
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: jsonFormat,
  defaultMeta: { 
    service: 'plotmix-svc',
    version: '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Ensure logs directory exists and set per-run file paths
const logsDir = path.resolve(process.cwd(), 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  // If directory creation fails, we still keep console logging
}

function formatRunTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

const RUN_ID = `${formatRunTimestamp(new Date())}-${process.pid}`;
const combinedLogPath = path.join(logsDir, `combined_${RUN_ID}.log`);
const errorLogPath = path.join(logsDir, `error_${RUN_ID}.log`);
const accessLogPath = path.join(logsDir, `access_${RUN_ID}.log`);

// Add file transports (per run) regardless of environment
logger.add(
  new winston.transports.File({
    filename: combinedLogPath,
    level: config.logging.level,
    format: jsonFormat,
  })
);
logger.add(
  new winston.transports.File({
    filename: errorLogPath,
    level: 'error',
    format: jsonFormat,
  })
);

// Create a stream for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim(), { type: 'http' });
  },
};

// Export different loggers for different purposes
export const accessLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  defaultMeta: { service: 'plotmix-svc', type: 'access' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: accessLogPath,
      level: 'info',
      format: jsonFormat,
    }),
  ],
});

export const errorLogger = winston.createLogger({
  level: 'error',
  format: jsonFormat,
  defaultMeta: { service: 'plotmix-svc', type: 'error' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: errorLogPath,
      level: 'error',
      format: jsonFormat,
    }),
  ],
}); 