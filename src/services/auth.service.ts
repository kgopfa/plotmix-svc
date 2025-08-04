import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { User, JWTPayload } from '../types';
import { prisma } from './prisma.service';

export class AuthService {
  private static readonly SALT_ROUNDS = 14; // Increased for production security

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
   */
  static generateNextAuthToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id, // NextAuth uses 'sub' for user ID
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  /**
   * Verify NextAuth JWT token
   * Used to validate tokens from the frontend
   */
  static verifyNextAuthToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
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
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info('User deleted successfully', {
      userId,
    });
  }
} 