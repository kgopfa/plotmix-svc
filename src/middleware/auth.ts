import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { JWTPayload, AuthenticatedRequest } from '../types';
import { AuthService } from '../services/auth.service';

/**
 * Middleware to validate NextAuth JWT tokens
 * Uses the NextAuth secret to validate tokens from the frontend
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
    return;
  }

  try {
    // Check if token is blacklisted (logout protection)
    const isBlacklisted = await AuthService.isTokenBlacklisted();
    if (isBlacklisted) {
      res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated (user logged out)' 
      });
      return;
    }

    // Validate NextAuth JWT token using the NextAuth secret
    const decoded = jwt.verify(token, config.nextAuth.secret) as JWTPayload;
    
    // NextAuth tokens have a different structure, so we need to adapt
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      sub: decoded.sub,
      id: decoded.id,
      userId: decoded.userId || decoded.sub || decoded.id, // Use userId for backward compatibility
      email: decoded.email,
      name: decoded.name,
      iat: decoded.iat,
      exp: decoded.exp,
    } as JWTPayload;

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(403).json({ 
      success: false,
      message: 'Invalid or expired token' 
    });
    return;
  }
};

/**
 * Optional authentication middleware
 * Allows requests to proceed even without a valid token
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, config.nextAuth.secret) as JWTPayload;
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      sub: decoded.sub,
      id: decoded.id,
      userId: decoded.userId || decoded.sub || decoded.id, // Use userId for backward compatibility
      email: decoded.email,
      name: decoded.name,
      iat: decoded.iat,
      exp: decoded.exp,
    } as JWTPayload;
    next();
  } catch (error) {
    // Token is invalid, but we continue without authentication
    console.warn('Invalid token in optional auth:', error);
    next();
  }
};

/**
 * Role-based access control middleware
 * Requires authentication and specific user role
 */
export const requireRole = (_requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implement role-based access control
    // For now, just check if user is authenticated
    const authenticatedReq = req as AuthenticatedRequest;
    if (!authenticatedReq.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  };
}; 