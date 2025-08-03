import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { JWTPayload, AuthenticatedRequest } from '../types';

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(401).json({
      success: false,
      message: 'Access token required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    req.user = decoded;
    logger.info('Authentication successful', {
      userId: decoded.userId,
      email: decoded.email,
    });
    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
    });
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      req.user = decoded;
    } catch (error) {
      // Silently ignore invalid tokens for optional auth
      logger.debug('Optional auth: Invalid token ignored', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  next();
}; 