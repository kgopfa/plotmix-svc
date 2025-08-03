import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger, accessLogger } from '../utils/logger';

// Custom Morgan token for request ID
morgan.token('id', (req: Request) => {
  return (req as any).id || 'unknown';
});

// Custom Morgan token for response time in milliseconds
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const responseTime = (morgan as any)['response-time'](req, res);
  return responseTime ? `${responseTime}ms` : '0ms';
});

// Custom Morgan token for user agent (truncated)
morgan.token('user-agent-short', (req: Request) => {
  const userAgent = req.get('User-Agent') || '';
  return userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
});

// Custom Morgan format for development
const devFormat = ':method :url :status :response-time-ms - :user-agent-short';

// Custom Morgan format for production
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms';

// Create Morgan middleware based on environment
export const morganMiddleware = morgan(
  process.env['NODE_ENV'] === 'production' ? prodFormat : devFormat,
  {
    stream: {
      write: (message: string) => {
        accessLogger.info(message.trim(), { type: 'http-access' });
      },
    },
  }
);

// Custom logging middleware for additional request details
export const requestLogger = (req: Request, res: Response, next: Function) => {
  const start = Date.now();
  
  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      ip: req.ip,
    });
  });

  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, _res: Response, next: Function) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  next(err);
}; 