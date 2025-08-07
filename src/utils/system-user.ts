import { prisma } from '../clients/database.client';
import { logger } from './logger';

let systemUserId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (systemUserId) {
    return systemUserId;
  }

  try {
    const systemUser = await prisma.user.findUnique({
      where: { email: 'system@plotmix.ai' },
      select: { id: true }
    });

    if (!systemUser) {
      throw new Error('System user not found. Please run the create-system-user script first.');
    }

    systemUserId = systemUser.id;
    return systemUserId;
  } catch (error) {
    logger.error('Failed to get system user ID', { error });
    throw error;
  }
}

export async function createSystemUserIfNotExists(): Promise<string> {
  try {
    // Check if system user exists
    const existingSystemUser = await prisma.user.findUnique({
      where: { email: 'system@plotmix.ai' },
      select: { id: true }
    });

    if (existingSystemUser) {
      systemUserId = existingSystemUser.id;
      return systemUserId;
    }

    // Create system user if it doesn't exist
    const systemUser = await prisma.user.create({
      data: {
        name: 'PlotMix AI',
        email: 'system@plotmix.ai',
        password: 'system-user-no-login', // This user should never be able to login
      },
      select: { id: true }
    });

    systemUserId = systemUser.id;
    logger.info('System user created automatically', { systemUserId });
    return systemUserId;
  } catch (error) {
    logger.error('Failed to create system user', { error });
    throw error;
  }
}
