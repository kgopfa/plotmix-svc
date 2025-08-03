import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';

export class HealthController {
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  static async successMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Success! You have successfully authenticated and accessed the protected endpoint.',
      data: {
        timestamp: new Date().toISOString(),
        user: req.user ? {
          userId: req.user.userId,
          email: req.user.email,
        } : null,
      },
    });
  }
} 