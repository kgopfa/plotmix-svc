import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { user, token } = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { user, token } = await AuthService.login(req.body);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Get profile failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Get the token from the Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'No valid token provided',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Logout user and blacklist token
      await AuthService.logout(req.user.userId, token);

      res.json({
        success: true,
        message: 'Logout successful',
        data: {
          logoutTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Validate user session using JWT token
   * Extracts user ID from token and validates user exists and is active
   */
  static async validateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const userId = req.user.userId;

      // Query user from database
      const user = await AuthService.getUserById(userId);
      
      if (!user) {
        logger.info('Session validation failed - user not found', {
          userId,
          ip: req.ip,
        });
        
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }
      
      // Check if user is active (you can add more conditions here)
      // For now, we'll consider any existing user as active
      
      logger.info('Session validation successful', {
        userId,
        ip: req.ip,
      });
      
      // Return user data if validation successful
      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          isActive: true, // You can make this dynamic based on user status
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
      
    } catch (error) {
      logger.error('Session validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        ip: req.ip,
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Look up a user account by email address for OAuth validation flows
   * Requires an internal API key passed via middleware
   */
  static async getUserByEmail(req: Request, res: Response): Promise<void> {
    try {
      const emailParam = req.query.email;
      const email = typeof emailParam === 'string' ? emailParam.toLowerCase().trim() : '';

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email query parameter is required',
        });
        return;
      }

      const user = await AuthService.getUserByEmail(email);

      res.json({
        success: true,
        data: {
          exists: !!user,
          user: user ?? null,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.query.email,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to look up user',
      });
    }
  }

  /**
   * Create a user account (used for OAuth provisioning from trusted callers)
   * Requires internal API key middleware
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, password } = req.body ?? {};

      const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
      const trimmedName = typeof name === 'string' ? name.trim() : '';

      if (!normalizedEmail || !trimmedName) {
        res.status(400).json({
          success: false,
          message: 'Both email and name are required to create a user',
        });
        return;
      }

      const user = await AuthService.createUser({
        email: normalizedEmail,
        name: trimmedName,
        password: typeof password === 'string' && password.length > 0 ? password : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.body?.email,
      });

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create user',
      });
    }
  }
} 