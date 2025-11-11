import { prisma } from '../clients/database.client';
import { logger } from './logger';

const DUMMY_USER_EMAIL = 'demo@plotmix.com';
const DUMMY_USER_NAME = 'Demo User';

let dummyUserId: string | null = null;

/**
 * Get or create the MVP dummy user
 * This ensures the dummy user exists in the database for foreign key constraints
 */
export async function getMvpDummyUserId(): Promise<string> {
  if (dummyUserId) {
    return dummyUserId;
  }

  try {
    // Try to find existing dummy user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: DUMMY_USER_EMAIL },
      select: { id: true }
    });

    if (existingUser) {
      dummyUserId = existingUser.id;
      return dummyUserId;
    }

    // Create dummy user if it doesn't exist
    const user = await prisma.user.create({
      data: {
        name: DUMMY_USER_NAME,
        email: DUMMY_USER_EMAIL,
        password: 'mvp-dummy-user-no-login', // This user should never be able to login
      },
      select: { id: true }
    });

    dummyUserId = user.id;
    logger.info('MVP dummy user created automatically', { dummyUserId });
    return dummyUserId;
  } catch (error) {
    logger.error('Failed to get or create MVP dummy user', { error });
    throw error;
  }
}

/**
 * Ensure MVP dummy user exists (used at startup)
 */
export async function ensureMvpDummyUserExists(): Promise<string> {
  return getMvpDummyUserId();
}

