import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';
import { createDefaultProjectConfiguration } from '../utils/project-config';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ApplyProjectChangeRequest,
  CreateSnapshotRequest,
  ProjectHistory,
  VersionInfo,
  Snapshot,
  ProjectWithRelations,
} from '../types';
import { DiffPatcher } from 'jsondiffpatch';

export class ProjectService {
  // Utility function for safe diff application
  private static safeDiffPatch(baseState: any, diff: any, diffPatcher: any): any {
    try {
      // First attempt: try to apply the diff directly
      return diffPatcher.patch(baseState, diff);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      
      // If the error is about setting properties on undefined, we need to pre-initialize the structure
      if (errMsg.includes('Cannot set properties of undefined') || errMsg.includes('Cannot read properties of undefined')) {
        logger.info('Diff patch failed due to undefined objects, attempting to pre-initialize structure', {
          error: errMsg
        });
        
        // Create a deep copy and pre-initialize the structure
        const safeBaseState = this.preInitializeStructure(baseState, diff);
        
        // Try again with the pre-initialized structure
        try {
          return diffPatcher.patch(safeBaseState, diff);
        } catch (retryErr) {
          const retryErrMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          logger.error('Diff patch failed even after pre-initialization', {
            originalError: errMsg,
            retryError: retryErrMsg
          });
          throw retryErr;
        }
      }
      
      // Re-throw the original error if it's not about undefined objects
      throw err;
    }
  }
  
  // Pre-initialize the structure based on the diff - supports both flat and scene-based schemas
  private static preInitializeStructure(baseState: any, diff: any): any {
    const safeState = JSON.parse(JSON.stringify(baseState));
    
    logger.info('Pre-initializing structure for safe diff application', {
      diffKeys: Object.keys(diff || {}),
      hasElementsDiff: !!(diff.elements && diff.elements._t === 'a'),
      hasGroupsDiff: !!(diff.groups && diff.groups._t === 'a'),
      hasTimelineDiff: !!diff.timeline,
      hasScenesDiff: !!(diff.scenes && diff.scenes._t === 'a'),
      schemaType: safeState.scenes ? 'scenes' : 'flat'
    });
    
    // Handle scene-based structure modifications
    if (diff.scenes && diff.scenes._t === 'a') {
      if (!Array.isArray(safeState.scenes)) {
        safeState.scenes = [];
        logger.info('Initialized missing scenes array');
      }
      
      // Ensure each scene has the required structure
      for (let i = 0; i < safeState.scenes.length; i++) {
        const scene = safeState.scenes[i];
        if (!scene.sceneCanvas) {
          scene.sceneCanvas = {
            elements: [],
            groups: [],
            timeline: {
              duration: 10,
              scale: 1,
              currentTime: 0,
              animationStates: {}
            }
          };
          logger.info(`Initialized missing sceneCanvas for scene ${i}`);
        }
        
        if (!Array.isArray(scene.sceneCanvas.elements)) {
          scene.sceneCanvas.elements = [];
        }
        if (!Array.isArray(scene.sceneCanvas.groups)) {
          scene.sceneCanvas.groups = [];
        }
        if (!scene.sceneCanvas.timeline || typeof scene.sceneCanvas.timeline !== 'object') {
          scene.sceneCanvas.timeline = {
            duration: 10,
            scale: 1,
            currentTime: 0,
            animationStates: {}
          };
        }
      }
    }
    
    // Note: Flat structure diffs will be transformed to scene-based diffs in applyProjectChange
    
    // Ensure dimensions exist
    if (!safeState.dimensions) {
      safeState.dimensions = {
        width: 1920,
        height: 1080
      };
      logger.info('Initialized missing dimensions');
    }
    
    logger.info('Structure pre-initialization completed', {
      finalStateStructure: {
        hasElements: !!safeState.elements,
        elementsLength: safeState.elements?.length || 0,
        hasGroups: !!safeState.groups,
        groupsLength: safeState.groups?.length || 0,
        hasTimeline: !!safeState.timeline,
        hasScenes: !!safeState.scenes,
        scenesLength: safeState.scenes?.length || 0,
        hasDimensions: !!safeState.dimensions
      }
    });
    
    return safeState;
  }

  static async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    const { features, mainState, configuration, ...restData } = projectData;
    const version = '1.0.0'; // initial version
    
    // Use default configuration if none provided
    const finalConfiguration = configuration || createDefaultProjectConfiguration();
    
    const project = await prisma.project.create({
      data: {
        ...restData,
        mainState,
        configuration: finalConfiguration as any,
        userId,
        version,
        features: features ? (features as any) : null,
        // Default to NATIVE unless explicitly set (e.g., GENERATED via content-gen)
        source: (restData as any)?.source ?? 'NATIVE',
      },
    });

    logger.info('Project created successfully', {
      projectId: project.id,
      userId,
      name: project.name,
    });

    return project;
  }

  static async getProjectById(projectId: string, userId: string): Promise<ProjectWithRelations | null> {
    // Check if user has access to the project
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        changes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        conversation: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            projectId: true,
          }
        },
      },
    }) as unknown as ProjectWithRelations | null;

    return project;
  }


  /**
   * Transform flat structure diffs to scene-based diffs for internal processing
   * This allows frontend to send flat diffs while maintaining scene-based structure internally
   */
  private static transformFlatDiffToSceneBasedDiff(diff: any, _currentState: any): any {
    // If diff already has scenes, it's already scene-based
    if (diff.scenes) {
      return diff;
    }

    // If no flat structure changes, return as-is
    if (!diff.elements && !diff.groups && !diff.timeline) {
      return diff;
    }

    // Transform flat diffs to scene-based diffs
    const transformedDiff = { ...diff };

    // Remove flat structure properties
    delete transformedDiff.elements;
    delete transformedDiff.groups;
    delete transformedDiff.timeline;

    // Ensure we have scenes structure
    if (!transformedDiff.scenes) {
      transformedDiff.scenes = { _t: 'a' };
    }

    // Transform elements diff to scene-based
    if (diff.elements) {
      transformedDiff.scenes['0'] = {
        _t: 'a',
        sceneCanvas: {
          _t: 'a',
          elements: diff.elements
        }
      };
    }

    // Transform groups diff to scene-based
    if (diff.groups) {
      if (!transformedDiff.scenes['0']) {
        transformedDiff.scenes['0'] = { _t: 'a' };
      }
      if (!transformedDiff.scenes['0'].sceneCanvas) {
        transformedDiff.scenes['0'].sceneCanvas = { _t: 'a' };
      }
      transformedDiff.scenes['0'].sceneCanvas.groups = diff.groups;
    }

    // Transform timeline diff to scene-based
    if (diff.timeline) {
      if (!transformedDiff.scenes['0']) {
        transformedDiff.scenes['0'] = { _t: 'a' };
      }
      if (!transformedDiff.scenes['0'].sceneCanvas) {
        transformedDiff.scenes['0'].sceneCanvas = { _t: 'a' };
      }
      transformedDiff.scenes['0'].sceneCanvas.timeline = diff.timeline;
    }

    logger.info('Transformed flat diff to scene-based diff', {
      originalDiffKeys: Object.keys(diff || {}),
      transformedDiffKeys: Object.keys(transformedDiff || {}),
      hasElementsTransform: !!(diff.elements),
      hasGroupsTransform: !!(diff.groups),
      hasTimelineTransform: !!(diff.timeline)
    });

    return transformedDiff;
  }

  static async getUserProjects(
    userId: string,
    pagination?: { page?: number; limit?: number },
    filters?: { source?: string }
  ): Promise<(Project & { conversation: { id: string } | null })[]> {
    const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
    const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : 20;
    const skip = (page - 1) * limit;

    return prisma.project.findMany({
      where: {
        OR: [
          { userId }, // Owned projects
          {
            collaborators: {
              some: {
                userId,
                status: 'accepted',
              },
            },
          }, // Collaborated projects
        ],
        ...(filters?.source ? { source: filters.source } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        conversation: {
          select: { id: true },
        },
      },
    });
  }

  static async convertToNative(projectId: string, userId: string): Promise<Project | null> {
    // Only the owner can convert
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== userId) {
      return null;
    }
    // Mark project as NATIVE, keep any existing conversation association intact
    return prisma.project.update({ where: { id: projectId }, data: { source: 'NATIVE' } });
  }

  static async updateProject(
    projectId: string,
    userId: string,
    updateData: UpdateProjectRequest
  ): Promise<Project | null> {
    // Check if user is the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return null;
    }

    const { features, mainState, configuration, title, ...restUpdateData } = updateData;
    
    // Prepare update data
    let updateFields: any = {
      ...restUpdateData,
      features: features ? (features as any) : undefined,
      updatedAt: new Date(),
    };
    
    // Handle mainState and configuration updates
    if (mainState) {
      updateFields.mainState = mainState;
    }
    if (configuration) {
      updateFields.configuration = configuration;
    }
    if (typeof title !== 'undefined') {
      updateFields.title = title;
    }

    // Bump version only if name, mainState, or title changed (not configuration)
    const shouldBumpVersion = Boolean(mainState || typeof restUpdateData.name !== 'undefined' || typeof title !== 'undefined');
    if (shouldBumpVersion) {
      const bump = (v: string | null): string => {
        const [majStr = '1', minStr = '0', patStr = '0'] = (v ?? '1.0.0').split('.');
        const maj = Number(majStr) || 1;
        const min = Number(minStr) || 0;
        const pat = Number(patStr) || 0;
        return `${maj}.${min}.${pat + 1}`;
      };
      updateFields.version = bump(project.version as unknown as string | null);
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateFields,
    });

    logger.info('Project updated successfully', {
      projectId,
      userId,
      updatedFields: Object.keys(updateData),
    });

    return updatedProject;
  }

  static async deleteProject(projectId: string, userId: string): Promise<boolean> {
    // Check if user is the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return false;
    }

    // Ensure associated conversation (and its messages) are removed, then the project.
    // Project changes, snapshots, and collaborators are configured to cascade on delete.
    await prisma.$transaction(async (tx) => {
      await tx.conversation.deleteMany({ where: { projectId } });
      await tx.project.delete({ where: { id: projectId } });
    });

    logger.info('Project deleted successfully', {
      projectId,
      userId,
    });

    return true;
  }

  // Version Control Methods
  static async applyProjectChange(
    projectId: string,
    userId: string,
    changeData: ApplyProjectChangeRequest
  ): Promise<Project | null> {
    // Check if user has edit access
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) {
      logger.error('User does not have edit access', {
        projectId,
        userId,
      });
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      logger.error('Project not found', {
        projectId,
        userId,
      });
      return null;
    }

    logger.info('Project state changes', {
      projectId,
      changeData,
    });

    const diffPatcher = new DiffPatcher();

    // Get current state - support both flat and scene-based schemas
    const currentState = (project.mainState as any) ?? {};
    const safeDiff = (changeData.diff ?? {}) as any;

    // Validate and normalize scene-based structure only
    let normalizedState: any;
    
    if (currentState.scenes && Array.isArray(currentState.scenes)) {
      // Valid scene-based schema - use as is
      normalizedState = { ...currentState };
      logger.info('Using existing scene-based schema', {
        scenesCount: currentState.scenes.length
      });
    } else {
      // Invalid or missing structure - throw error to identify issues
      logger.error('Project has invalid mainState structure - must use scene-based format', {
        projectId,
        currentStateKeys: Object.keys(currentState || {}),
        hasScenes: !!(currentState.scenes),
        hasElements: !!(currentState.elements),
        hasGroups: !!(currentState.groups),
        hasTimeline: !!(currentState.timeline)
      });
      throw new Error('Project mainState must use the new scene-based structure with a "scenes" array. Found legacy flat structure.');
    }

    // Ensure we have the basic structure
    if (!Array.isArray(normalizedState.scenes)) {
      normalizedState.scenes = [];
    }
    
    // Ensure each scene has the required structure
    for (let i = 0; i < normalizedState.scenes.length; i++) {
      const scene = normalizedState.scenes[i];
      if (!scene.sceneId) {
        scene.sceneId = `scene-${i}`;
      }
      if (!scene.sceneName) {
        scene.sceneName = `Scene ${i + 1}`;
      }
      if (!scene.sceneCanvas) {
        scene.sceneCanvas = {
          elements: [],
          groups: [],
          timeline: {
            duration: 10,
            scale: 1,
            currentTime: 0,
            animationStates: {}
          }
        };
      }
      if (!Array.isArray(scene.sceneCanvas.elements)) {
        scene.sceneCanvas.elements = [];
      }
      if (!Array.isArray(scene.sceneCanvas.groups)) {
        scene.sceneCanvas.groups = [];
      }
      if (!scene.sceneCanvas.timeline || typeof scene.sceneCanvas.timeline !== 'object') {
        scene.sceneCanvas.timeline = {
          duration: 10,
          scale: 1,
          currentTime: 0,
          animationStates: {}
        };
      }
    }
    
    // Ensure dimensions exist
    if (!normalizedState.dimensions) {
      normalizedState.dimensions = {
        width: 1920,
        height: 1080
      };
    }
    
    // The diff modifies scene-based structure only
    logger.info('Applying diff to scene-based mainState', {
      projectId,
      userId,
      diffType: 'scene_based_modification',
      hasScenesDiff: !!safeDiff.scenes,
      normalizedScenesCount: normalizedState.scenes.length,
      totalElementsCount: normalizedState.scenes.reduce((sum: number, scene: any) => sum + (scene.sceneCanvas?.elements?.length || 0), 0)
    });
    
    // Apply diff directly to the normalized state
    let baseState = { ...normalizedState };
    
    // Transform any flat structure diffs to scene-based diffs before applying
    const transformedDiff = this.transformFlatDiffToSceneBasedDiff(safeDiff, baseState);
    
    let newState: any;
    
    try {
      newState = this.safeDiffPatch(baseState, transformedDiff, diffPatcher);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error('Diff patch failed for mainState content', {
        error: errMsg,
        projectId,
        userId,
        changeData,
      });
      throw err;
    }
      

    // Compute new version (bump patch)
    const bump = (v: string | null): string => {
      const [majStr = '1', minStr = '0', patStr = '0'] = (v ?? '1.0.0').split('.');
      const maj = Number(majStr) || 1;
      const min = Number(minStr) || 0;
      const pat = Number(patStr) || 0;
      return `${maj}.${min}.${pat + 1}`;
    };
    const newVersion = bump(project.version as unknown as string | null);

    // Create the change record (store only diff)
    await prisma.projectChange.create({
      data: {
        version: newVersion,
        diff: safeDiff,
        actionDescription: changeData.actionDescription ?? null,
        clientHash: changeData.clientHash ?? null,
        projectId,
        authorUserId: userId,
      },
    });

    // Update project version and mainState - use scene-based schema
    const finalMainState = {
      dimensions: newState.dimensions || normalizedState.dimensions || { width: 1920, height: 1080 },
      scenes: newState.scenes || normalizedState.scenes || []
    };

    // Ensure final state has valid scene structure
    if (finalMainState.scenes.length === 0) {
      finalMainState.scenes = [{
        sceneId: 'default-scene',
        sceneName: 'Default Scene',
        sceneCanvas: {
          elements: [],
          groups: [],
          timeline: {
            duration: 10,
            scale: 1,
            currentTime: 0,
            animationStates: {}
          }
        }
      }];
    }

    // Log the structure being saved
    logger.info('Saving project with mainState structure', {
      projectId,
      userId,
      mainStateStructure: JSON.stringify(finalMainState, null, 2),
      mainStateSummary: {
        hasDimensions: !!finalMainState.dimensions,
        dimensions: finalMainState.dimensions,
        scenesCount: finalMainState.scenes?.length || 0,
        totalElementsCount: finalMainState.scenes?.reduce((sum: number, scene: any) => sum + (scene.sceneCanvas?.elements?.length || 0), 0) || 0,
        totalGroupsCount: finalMainState.scenes?.reduce((sum: number, scene: any) => sum + (scene.sceneCanvas?.groups?.length || 0), 0) || 0,
        schemaType: 'scenes'
      }
    });

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        version: newVersion,
        mainState: finalMainState as any,
        updatedAt: new Date(),
      },
    });

    logger.info('Project change applied successfully', {
      projectId,
      userId,
      version: newVersion,
      actionDescription: changeData.actionDescription,
    });

    return updatedProject;
  }

  static async createSnapshot(
    projectId: string,
    userId: string,
    snapshotData: CreateSnapshotRequest
  ): Promise<Snapshot | null> {
    // Check if user has access
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    const snapshot = await prisma.snapshot.create({
      data: {
        ...snapshotData,
        projectId,
        state: project.mainState as any, // Use current project state
      },
    });

    logger.info('Project snapshot created successfully', {
      projectId,
      userId,
      version: snapshotData.version,
    });

    return snapshot;
  }

  static async getProjectHistory(projectId: string, userId: string): Promise<ProjectHistory | null> {
    // Check if user has access
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        changes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return null;
    }

    const changes: VersionInfo[] = project.changes.map(change => ({
      version: change.version,
      timestamp: change.createdAt,
      authorId: change.author.id,
      authorName: change.author.name,
      ...(change.actionDescription && { actionDescription: change.actionDescription }),
    }));

    const snapshots: VersionInfo[] = project.snapshots.map(snapshot => ({
      version: snapshot.version,
      timestamp: snapshot.createdAt,
      authorId: '', // Snapshots don't have authors in current schema
      authorName: 'System',
    }));

    return {
      project,
      changes,
      snapshots,
    };
  }

  static async rollbackToVersion(projectId: string, userId: string, version: string): Promise<Project | null> {
    // Check if user has edit access
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) {
      return null;
    }

    // Try to find snapshot first (faster rollback)
    let snapshot = await prisma.snapshot.findFirst({
      where: {
        projectId,
        version,
      },
    });

    if (snapshot) {
      // Rollback using snapshot
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          mainState: snapshot.state as any,
          version,
          updatedAt: new Date(),
        },
      });

      logger.info('Project rolled back using snapshot', {
        projectId,
        userId,
        version,
      });

      return updatedProject;
    }

    // If no snapshot, compute state by rolling back diffs from current to target
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return null;

    const diffPatcher = new DiffPatcher();

    // Get changes newer than target version (to undo)
    const changesToUndo = await prisma.projectChange.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    // Find the index where target version appears; everything before that should be undone
    let workingState = JSON.parse(JSON.stringify(project.mainState ?? {}));
    for (const change of changesToUndo) {
      if (change.version === version) break; // stop once we reached target version
      if (!change.diff) continue;
      // Inverse patch to undo
      workingState = diffPatcher.unpatch(workingState, change.diff as any);
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        mainState: workingState as any,
        version,
        updatedAt: new Date(),
      },
    });

    logger.info('Project rolled back by reversing diffs', {
      projectId,
      userId,
      version,
    });

    return updatedProject;
  }

  static async rollforward(projectId: string, userId: string, steps: number = 1): Promise<Project | null> {
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) return null;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return null;

    const diffPatcher = new DiffPatcher();
    // Get changes in chronological order
    const changes = await prisma.projectChange.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Find the current version index
    let currentIndex = changes.findIndex(c => c.version === project.version);
    if (currentIndex === -1) {
      // If not found, assume before all changes
      currentIndex = -1;
    }

    let workingState = JSON.parse(JSON.stringify(project.mainState ?? {}));
    let targetIndex = Math.min(currentIndex + steps, changes.length - 1);
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
      const change = changes[i];
      if (!change) break;
      if (!change.diff) continue;
      workingState = diffPatcher.patch(workingState, change.diff as any);
    }

    const newVersion = targetIndex >= 0 && changes[targetIndex] ? changes[targetIndex].version : project.version;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        mainState: workingState as any,
        version: newVersion,
        updatedAt: new Date(),
      },
    });

    logger.info('Project rolled forward', { projectId, userId, steps, newVersion });
    return updated;
  }

  static async undo(projectId: string, userId: string): Promise<Project | null> {
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) return null;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return null;

    // Find the change corresponding to current version
    const changes = await prisma.projectChange.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    const currentIdx = changes.findIndex(c => c.version === project.version);
    if (currentIdx === -1) {
      // Nothing to undo
      return project;
    }

    const diffPatcher = new DiffPatcher();
    let workingState = JSON.parse(JSON.stringify(project.mainState ?? {}));
    const currentChange = changes[currentIdx];
    if (currentChange?.diff) {
      // Unapply last change
      workingState = diffPatcher.unpatch(workingState, currentChange.diff as any);
    }

    const prevChange = currentIdx > 0 ? changes[currentIdx - 1] : undefined;
    const newVersion = prevChange ? prevChange.version : '1.0.0';

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        mainState: workingState as any,
        version: newVersion,
        updatedAt: new Date(),
      },
    });

    logger.info('Project undo (single step) applied', { projectId, userId, from: project.version, to: newVersion });
    return updated;
  }

  static async redo(projectId: string, userId: string): Promise<Project | null> {
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) return null;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return null;

    const changes = await prisma.projectChange.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    // Determine current index; -1 means before first change
    const currentIdx = changes.findIndex(c => c.version === project.version);
    const nextIdx = currentIdx + 1;
    if (nextIdx < 0 || nextIdx >= changes.length) {
      // Nothing to redo
      return project;
    }

    const diffPatcher = new DiffPatcher();
    let workingState = JSON.parse(JSON.stringify(project.mainState ?? {}));
    const nextChange = changes[nextIdx];
    if (nextChange?.diff) {
      workingState = diffPatcher.patch(workingState, nextChange.diff as any);
    }

    const newVersion = nextChange ? nextChange.version : project.version;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        mainState: workingState as any,
        version: newVersion,
        updatedAt: new Date(),
      },
    });

    logger.info('Project redo (single step) applied', { projectId, userId, to: newVersion });
    return updated;
  }

  // Helper Methods
  private static async userHasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId }, // Owner
          {
            collaborators: {
              some: {
                userId,
                status: 'accepted',
              },
            },
          }, // Collaborator
        ],
      },
    });

    return !!project;
  }

  private static async userHasEditAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId }, // Owner
          {
            collaborators: {
              some: {
                userId,
                status: 'accepted',
                role: { in: ['editor', 'admin'] },
              },
            },
          }, // Editor or Admin
        ],
      },
    });

    return !!project;
  }
} 