import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { User, JWTPayload, LoginRequest, RegisterRequest } from '../types';

// In-memory user storage for demo purposes
// In production, this would be replaced with a database
const users: Map<string, User> = new Map();

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  static async register(userData: RegisterRequest): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = userData;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(user => user.email === email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user: User = {
      id: this.generateUserId(),
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store user
    users.set(user.id, user);

    // Generate token
    const token = this.generateToken(user);

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async login(credentials: LoginRequest): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = credentials;

    // Find user
    const user = Array.from(users.values()).find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  static async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = users.get(userId);
    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private static generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 