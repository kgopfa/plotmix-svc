import winston from 'winston';
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

// Add file transports for production
if (config.nodeEnv === 'production') {
  // Error log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // Combined log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  // Access log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/access.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

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
  ],
}); 