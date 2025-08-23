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

    // TEMPORARY: Log the project structure being retrieved
    if (project) {
      logger.info('Retrieved project structure from database', {
        projectId,
        userId,
        mainStateStructure: JSON.stringify(project.mainState, null, 2),
        mainStateSummary: {
          hasMainState: !!project.mainState,
          mainStateType: typeof project.mainState,
          hasScenes: !!(project.mainState as any)?.scenes,
          scenesIsArray: Array.isArray((project.mainState as any)?.scenes),
          scenesCount: (project.mainState as any)?.scenes?.length || 0,
          firstScene: (project.mainState as any)?.scenes?.[0] ? {
            hasSceneCanvas: !!(project.mainState as any).scenes[0].sceneCanvas,
            elementsCount: (project.mainState as any).scenes[0].sceneCanvas?.elements?.length || 0,
            groupsCount: (project.mainState as any).scenes[0].sceneCanvas?.groups?.length || 0,
          } : null,
        }
      });
    }

    return project;
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

    // Get current state - must use new schema format
    const currentState = (project.mainState as any) ?? {};
    const safeDiff = (changeData.diff ?? {}) as any;

    // Validate that project uses new schema format
    if (!currentState.scenes || !Array.isArray(currentState.scenes) || currentState.scenes.length === 0) {
      throw new Error('Invalid mainState format: missing scenes array');
    }
    
    // Check if the diff is trying to modify the scenes array structure
    const isModifyingScenesArray = safeDiff.scenes && safeDiff.scenes._t === 'a';
    
    let newState: any;
    
    if (isModifyingScenesArray) {
      // The diff is modifying the scenes array structure, but we need to handle timeline modifications specially
      // Check if this is a timeline modification that should go to sceneCanvas.timeline
      const isTimelineModification = safeDiff.scenes['0'] && safeDiff.scenes['0'].timeline;
      
      if (isTimelineModification) {
        // This is a timeline modification, apply it to the sceneCanvas.timeline
        logger.info('Applying timeline diff to sceneCanvas.timeline', {
          projectId,
          userId,
          diffType: 'timeline_modification'
        });
        
        const firstScene = currentState.scenes[0];
        if (!firstScene || !firstScene.sceneCanvas) {
          throw new Error('Invalid schema: missing first scene or sceneCanvas');
        }
        
        // Create a modified sceneCanvas with updated timeline
        const updatedSceneCanvas = { ...firstScene.sceneCanvas };
        
        // Apply timeline changes
        if (safeDiff.scenes['0'].timeline.scale) {
          updatedSceneCanvas.timeline.scale = safeDiff.scenes['0'].timeline.scale[1]; // Take the new value
        }
        if (safeDiff.scenes['0'].timeline.duration) {
          updatedSceneCanvas.timeline.duration = safeDiff.scenes['0'].timeline.duration[1]; // Take the new value
        }
        
        // Create new state with updated sceneCanvas
        newState = {
          ...currentState,
          scenes: [{
            ...firstScene,
            sceneCanvas: updatedSceneCanvas,
            lastModified: safeDiff.scenes['0'].lastModified ? safeDiff.scenes['0'].lastModified[1] : new Date().toISOString()
          }]
        };
      } else {
        // This is a different type of scenes array modification, apply it to the entire mainState
        logger.info('Applying diff to scenes array structure', {
          projectId,
          userId,
          diffType: 'scenes_array_modification'
        });
        
        try {
          newState = diffPatcher.patch(currentState, safeDiff);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          logger.error('Diff patch failed for scenes array modification', {
            error: errMsg,
            projectId,
            userId,
            changeData,
          });
          throw err;
        }
      }
    } else {
      // The diff is modifying sceneCanvas content, apply it to the first scene's canvas
      const firstScene = currentState.scenes[0];
      if (!firstScene || !firstScene.sceneCanvas) {
        throw new Error('Invalid schema: missing first scene or sceneCanvas');
      }
      
      let baseState = JSON.parse(JSON.stringify(firstScene.sceneCanvas));
      // Pre-initialize common containers expected by the diff
      if (safeDiff?.elements && safeDiff.elements._t === 'a' && !Array.isArray(baseState.elements)) {
        baseState.elements = [];
      }
      if (safeDiff?.groups && safeDiff.groups._t === 'a' && !Array.isArray(baseState.groups)) {
        baseState.groups = [];
      }
      if (safeDiff?.timeline && (typeof baseState.timeline !== 'object' || baseState.timeline === null)) {
        baseState.timeline = {};
      }
      if (
        safeDiff?.timeline?.animationStates &&
        (typeof baseState.timeline?.animationStates !== 'object' || baseState.timeline.animationStates === null)
      ) {
        baseState.timeline.animationStates = {};
      }

      try {
        newState = diffPatcher.patch(baseState, safeDiff);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error('Diff patch failed for sceneCanvas content', {
          error: errMsg,
          projectId,
          userId,
          changeData,
        });
        // jsondiffpatch uses Array#splice for array patches. If the target path is undefined,
        // patching may throw "Cannot read properties of undefined (reading 'splice')".
        if (errMsg && errMsg.toLowerCase().includes('splice')) {
          // Initialize common containers if the diff indicates array/object patches
          if (safeDiff?.elements && safeDiff.elements._t === 'a' && !Array.isArray(baseState.elements)) {
            baseState.elements = [];
          }
          if (safeDiff?.groups && safeDiff.groups._t === 'a' && !Array.isArray(baseState.groups)) {
            baseState.groups = [];
          }
          if (safeDiff?.timeline && (typeof baseState.timeline !== 'object' || baseState.timeline === null)) {
            baseState.timeline = {};
          }
          if (
            safeDiff?.timeline?.animationStates &&
            (typeof baseState.timeline?.animationStates !== 'object' || baseState.timeline.animationStates === null)
          ) {
            baseState.timeline.animationStates = {};
          }
          try {
            newState = diffPatcher.patch(baseState, safeDiff);
          } catch (err2) {
            logger.error('Diff patch failed even after initializing containers', {
              error: err2 instanceof Error ? err2.message : 'Unknown error',
              projectId,
              userId,
              diff: safeDiff,
              baseStateKeys: Object.keys(baseState ?? {}),
            });
            throw err2;
          }
        } else {
          throw err;
        }
      }
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

    // Update project version and mainState - always maintain new schema format
    let finalMainState: any;
    
    if (isModifyingScenesArray) {
      // The diff was applied to the entire mainState or handled specially for timeline
      finalMainState = newState;
    } else {
      // The diff was applied to sceneCanvas content, update the first scene
      const updatedScenes = [...currentState.scenes];
      if (updatedScenes[0]) {
        updatedScenes[0] = {
          sceneId: updatedScenes[0].sceneId,
          sceneName: updatedScenes[0].sceneName,
          sceneCanvas: newState
        };
      }
      finalMainState = { 
        dimensions: currentState.dimensions,
        scenes: updatedScenes 
      };
    }

    // TEMPORARY: Log the structure being saved
    logger.info('Saving project with mainState structure', {
      projectId,
      userId,
      mainStateStructure: JSON.stringify(finalMainState, null, 2),
      mainStateSummary: {
        hasDimensions: !!finalMainState.dimensions,
        dimensions: finalMainState.dimensions,
        scenesCount: finalMainState.scenes?.length || 0,
        firstScene: finalMainState.scenes?.[0] ? {
          sceneId: finalMainState.scenes[0].sceneId,
          sceneName: finalMainState.scenes[0].sceneName,
          elementsCount: finalMainState.scenes[0].sceneCanvas?.elements?.length || 0,
          groupsCount: finalMainState.scenes[0].sceneCanvas?.groups?.length || 0,
          timeline: finalMainState.scenes[0].timeline,
        } : null,
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