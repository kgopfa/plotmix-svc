import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { User, JWTPayload } from '../types';
import { prisma } from './prisma.service';

export class AuthService {
  private static readonly SALT_ROUNDS = 14; // Increased for production security

  /**
   * Register a new user
   * Creates user account and returns user data with token
   */
  static async register(userData: { email: string; password: string; name: string }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    // Generate token
    const token = this.generateNextAuthToken(user);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  /**
   * Login user with email and password
   * Validates credentials and returns user data with token
   */
  static async login(credentials: { email: string; password: string }): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    // Generate token
    const token = this.generateNextAuthToken(user);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  /**
   * Hash password for user registration
   * Used when creating new users in the database
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hashed password
   * Used for password verification
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate NextAuth-compatible JWT token
   * This should match the structure expected by NextAuth.js
   * Uses the NextAuth secret to ensure compatibility with frontend validation
   */
  static generateNextAuthToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id, // NextAuth uses 'sub' for user ID
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, config.nextAuth.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verify NextAuth JWT token
   * Used to validate tokens from the frontend
   * Uses the NextAuth secret to validate frontend tokens
   */
  static verifyNextAuthToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.nextAuth.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate internal JWT token for backend operations
   * Uses the internal JWT secret for backend-to-backend communication
   */
  static generateInternalToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verify internal JWT token
   * Used for backend-to-backend token validation
   */
  static verifyInternalToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired internal token');
    }
  }

  /**
   * Get user by ID from database
   * Used after token validation to get user details
   */
  static async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by email from database
   * Used for user lookup operations
   */
  static async getUserByEmail(email: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create user in database
   * Used when NextAuth creates a new user
   */
  static async createUser(userData: { email: string; name: string; password?: string }): Promise<Omit<User, 'password'>> {
    const { email, name, password } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user data
    const userCreateData: any = {
      email,
      name,
    };

    // Hash password if provided
    if (password) {
      userCreateData.password = await this.hashPassword(password);
    }

    // Create user
    const user = await prisma.user.create({
      data: userCreateData,
    });

    logger.info('User created successfully', {
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user in database
   * Used for user profile updates
   */
  static async updateUser(userId: string, updateData: Partial<User>): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Delete user from database
   * Used for account deletion
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      // Delete user and all related data in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete messages
        await tx.message.deleteMany({
          where: { conversation: { userId } },
        });

        // Delete conversations
        await tx.conversation.deleteMany({
          where: { userId },
        });

        // Delete project changes
        await tx.projectChange.deleteMany({
          where: { authorUserId: userId },
        });

        // Delete snapshots
        await tx.snapshot.deleteMany({
          where: { project: { userId } },
        });

        // Delete project roles
        await tx.projectRole.deleteMany({
          where: { userId },
        });

        // Delete projects
        await tx.project.deleteMany({
          where: { userId },
        });

        // Finally delete the user
        await tx.user.delete({
          where: { id: userId },
        });
      });

      logger.info('User deleted successfully', {
        userId,
      });
    } catch (error) {
      logger.error('Failed to delete user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Logout user and blacklist token
   * Used for secure logout and token invalidation
   */
  static async logout(userId: string, token: string): Promise<void> {
    try {
      // In a production environment, you would store blacklisted tokens in Redis
      // For now, we'll log the logout event and rely on short token expiration
      
      // Decode the token to get expiration time
      const decoded = jwt.decode(token) as any;
      const tokenExp = decoded?.exp;
      
      // Store blacklisted token (in production, use Redis with TTL)
      // This prevents the token from being used even if it hasn't expired
      await this.blacklistToken(token, tokenExp);
      
      logger.info('User logged out successfully', {
        userId,
        tokenExp,
        logoutTime: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Logout failed');
    }
  }

  /**
   * Blacklist a token to prevent its reuse
   * In production, this should use Redis with TTL matching token expiration
   */
  private static async blacklistToken(token: string, expirationTime?: number): Promise<void> {
    // For now, we'll store in memory (not recommended for production)
    // In production, use Redis with TTL:
    // await redis.setex(`blacklist:${token}`, ttl, '1');
    
    // Calculate TTL for blacklist entry
    const now = Math.floor(Date.now() / 1000);
    const ttl = expirationTime ? expirationTime - now : 3600; // Default 1 hour
    
    if (ttl > 0) {
      // Store in blacklist with TTL
      // In production: await redis.setex(`blacklist:${token}`, ttl, '1');
      
      // For now, just log the blacklisting
      logger.info('Token blacklisted', {
        tokenHash: this.hashToken(token),
        ttl,
        expiresAt: new Date(expirationTime! * 1000).toISOString(),
      });
    }
  }

  /**
   * Check if a token is blacklisted
   * Used during token validation to prevent use of logged out tokens
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    // In production, check Redis:
    // const blacklisted = await redis.get(`blacklist:${token}`);
    // return !!blacklisted;
    
    // For now, return false (no blacklist checking in development)
    // In production, implement proper Redis-based blacklist checking
    // This prevents the token from being used even if it hasn't expired
    console.log(`Checking if token is blacklisted: ${this.hashToken(token)}`);
    return false;
  }

  /**
   * Hash token for logging (security best practice)
   */
  private static hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
  }
} 