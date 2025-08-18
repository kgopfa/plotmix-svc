import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';

export class DesignerPromptService {
  static async recordPrompt(params: {
    projectId: string;
    userId: string;
    prompt: string;
    aiResponse?: string | null;
    status?: 'applied' | 'failed' | 'draft';
    resultVersion?: string | null;
    metadata?: Record<string, unknown> | null;
  }) {
    const { projectId, userId, prompt, aiResponse = null, status = 'applied', resultVersion = null, metadata = null } = params;
    try {
      const rec = await prisma.designerPrompt.create({
        data: {
          projectId,
          userId,
          prompt,
          aiResponse: aiResponse || null,
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

  static async deletePrompt(id: string, projectId: string, userId: string) {
    // Ensure ownership
    const existing = await prisma.designerPrompt.findFirst({ where: { id, projectId, userId } });
    if (!existing) return false;
    await prisma.designerPrompt.delete({ where: { id } });
    return true;
  }

  static async clearPrompts(projectId: string, userId: string) {
    const res = await prisma.designerPrompt.deleteMany({ where: { projectId, userId } });
    return res.count;
  }
}


