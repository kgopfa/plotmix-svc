import { prisma } from './prisma.service';
import { logger } from '../utils/logger';
import { ProjectFeatures } from '../types';

export class ProjectFeaturesService {
  static async getProjectFeatures(projectId: string): Promise<ProjectFeatures> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { features: true },
    });

    if (!project || !project.features) {
      return this.getDefaultFeatures();
    }

    return project.features as ProjectFeatures;
  }

  static async updateProjectFeatures(
    projectId: string,
    features: Partial<ProjectFeatures>
  ): Promise<ProjectFeatures> {
    // Validate features before updating
    this.validateFeatures(features);

    const currentFeatures = await this.getProjectFeatures(projectId);
    const updatedFeatures = { ...currentFeatures, ...features };

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { features: updatedFeatures },
      select: { features: true },
    });

    logger.info('Project features updated successfully', {
      projectId,
      features: updatedFeatures,
    });

    return updatedProject.features as ProjectFeatures;
  }

  static validateFeatures(features: Partial<ProjectFeatures>): void {
    // Validate attachments configuration
    if (features.attachments) {
      if (features.attachments.maxFileSize && features.attachments.maxFileSize <= 0) {
        throw new Error('Max file size must be greater than 0');
      }
      if (features.attachments.allowedTypes && !Array.isArray(features.attachments.allowedTypes)) {
        throw new Error('Allowed types must be an array');
      }
    }

    // Validate audio configuration
    if (features.audio) {
      if (typeof features.audio.enabled !== 'boolean') {
        throw new Error('Audio enabled must be a boolean');
      }
    }

    // Validate music configuration
    if (features.music) {
      if (typeof features.music.enabled !== 'boolean') {
        throw new Error('Music enabled must be a boolean');
      }
    }

    // Validate web search configuration
    if (features.webSearch) {
      if (typeof features.webSearch.enabled !== 'boolean') {
        throw new Error('Web search enabled must be a boolean');
      }
      if (features.webSearch.sources && !Array.isArray(features.webSearch.sources)) {
        throw new Error('Web search sources must be an array');
      }
    }
  }

  static getDefaultFeatures(): ProjectFeatures {
    return {
      attachments: { enabled: false },
      audio: { enabled: false },
      music: { enabled: false },
      webSearch: { enabled: false },
    };
  }

  static async validateMessageFeatures(
    projectId: string,
    messageData: {
      attachments?: Array<any>;
      options?: {
        webSearch?: boolean;
        audio?: boolean;
        music?: boolean;
      };
    }
  ): Promise<{ valid: boolean; errors: string[] }> {
    const features = await this.getProjectFeatures(projectId);
    const errors: string[] = [];

    // Validate attachments
    if (messageData.attachments?.length && !features.attachments?.enabled) {
      errors.push('Attachments are not enabled for this project');
    }

    // Validate web search
    if (messageData.options?.webSearch && !features.webSearch?.enabled) {
      errors.push('Web search is not enabled for this project');
    }

    // Validate audio features
    if (messageData.options?.audio && !features.audio?.enabled) {
      errors.push('Audio features are not enabled for this project');
    }

    // Validate music features
    if (messageData.options?.music && !features.music?.enabled) {
      errors.push('Music features are not enabled for this project');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
} 