import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { JWTPayload, AuthenticatedRequest } from '../types';

/**
 * Middleware to validate NextAuth JWT tokens
 * This replaces the previous JWT validation to work with NextAuth.js tokens
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Validate NextAuth JWT token using the same secret
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    
    // NextAuth tokens have a different structure, so we need to adapt
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      id: decoded.sub || decoded.id, // NextAuth uses 'sub' for user ID
      email: decoded.email,
      name: decoded.name,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Allows requests to proceed even without a valid token
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without authentication
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      name: decoded.name,
      iat: decoded.iat,
      exp: decoded.exp,
    };
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
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authenticatedReq = req as AuthenticatedRequest;
    
    if (!authenticatedReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // For now, we'll implement basic role checking
    // In a real app, you'd check user roles from the database
    if (authenticatedReq.user.email === 'admin@example.com') {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}; 