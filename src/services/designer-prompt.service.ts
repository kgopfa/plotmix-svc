import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';

export class DesignerPromptService {
  static async recordPrompt(params: {
    projectId: string;
    userId: string;
    prompt: string;
    status?: 'applied' | 'failed' | 'draft';
    resultVersion?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const { projectId, userId, prompt, status = 'applied', resultVersion = null, metadata = null } = params;
    try {
      const rec = await prisma.designerPrompt.create({
        data: {
          projectId,
          userId,
          prompt,
          status,
          resultVersion: resultVersion || null,
          metadata: metadata as any,
        },
      });
      logger.info('Designer prompt recorded', { id: rec.id, projectId, userId, status, resultVersion });
      return rec;
    } catch (error) {
      logger.error('Failed to record designer prompt', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        userId,
      });
      throw error;
    }
  }

  static async listPrompts(projectId: string, userId: string, limit = 50) {
    return prisma.designerPrompt.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}


