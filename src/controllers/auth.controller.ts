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
   * Validate user exists and is active
   * Used by frontend to check if user session is still valid
   */
  static async validateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      // Query user from database
      const user = await AuthService.getUserById(userId);
      
      if (!user) {
        logger.info('User validation failed - user not found', {
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
      // You can add fields like isActive, deletedAt, etc. to your User model if needed
      
      logger.info('User validation successful', {
        userId,
        ip: req.ip,
      });
      
      // Return user data
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
      logger.error('User validation error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params['userId'],
        ip: req.ip,
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
} 