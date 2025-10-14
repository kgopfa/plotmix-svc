import { Request } from 'express';
import { User as PrismaUser, Project as PrismaProject, ProjectChange as PrismaProjectChange, Snapshot as PrismaSnapshot, ProjectRole as PrismaProjectRole, Conversation as PrismaConversation, Message as PrismaMessage } from '@prisma/client';

// Sanitize exposed User type to exclude password by default in service/controller layers
export type User = Omit<PrismaUser, 'password'> & { password?: never };
export type Project = PrismaProject;
export type ProjectChange = PrismaProjectChange;
export type Snapshot = PrismaSnapshot;
export type ProjectRole = PrismaProjectRole;
export type Conversation = PrismaConversation;
export type Message = PrismaMessage;
export type DesignerPrompt = import('@prisma/client').DesignerPrompt;

// Message Type Constants
export const MESSAGE_TYPES = {
  USER: 'user',
  LLM: 'llm',
  SYSTEM: 'system',
  CANVAS_GENERATION: 'canvas_generation',
  ERROR: 'error'
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

// Project Features Interface
export interface ProjectFeatures {
  attachments?: {
    enabled: boolean;
    maxFileSize?: number; // in bytes
    allowedTypes?: string[]; // e.g., ['image/*', 'text/plain']
  };
  audio?: {
    enabled: boolean;
    speechToText?: boolean;
    textToSpeech?: boolean;
  };
  music?: {
    enabled: boolean;
    generation?: boolean;
    background?: boolean;
  };
  webSearch?: {
    enabled: boolean;
    sources?: string[]; // e.g., ['google', 'bing', 'wikipedia']
  };
}

export interface JWTPayload {
  // NextAuth JWT token structure
  sub?: string; // User ID (NextAuth uses 'sub')
  id?: string; // Alternative user ID field
  userId?: string; // Legacy user ID field
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// Project Types
export interface CreateProjectRequest {
  name: string;
  title?: string;
  description?: string;
  source?: string;
  mainState: Record<string, any>; // Required canvas state
  configuration?: Record<string, any>; // Optional UI configuration
  features?: ProjectFeatures;
}

export interface UpdateProjectRequest {
  name?: string;
  title?: string;
  mainState?: Record<string, any>; // Optional canvas state update
  configuration?: Record<string, any>; // Optional UI configuration update
  features?: ProjectFeatures;
}

export interface ProjectWithRelations extends Project {
  owner: Pick<User, 'id' | 'name' | 'email' | 'createdAt' | 'updatedAt'>;
  changes: ProjectChange[];
  snapshots: Snapshot[];
  collaborators: ProjectRole[];
  conversation: Conversation | null;
  designerPrompts?: DesignerPrompt[];
}

// Conversation Types
export interface CreateConversationRequest {
  initialPrompt?: string;
  projectId?: string;
  features?: ProjectFeatures;
}

export interface CreateProjectWithConversationRequest {
  prompt: string;
  name?: string;
  title?: string;
  features?: ProjectFeatures;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    url?: string;
  }>;
  options?: {
    webSearch?: boolean;
    audio?: boolean;
    music?: boolean;
  };
}

export interface ProjectConfigurationResponse {
  project: Project;
  conversationId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface UpdateConversationRequest {
  // No fields to update since conversations no longer have titles
}

export interface ConversationFilters {
  page?: number | undefined;
  limit?: number | undefined;
  projectId?: string | undefined;
}

export interface ConversationWithRelations extends Conversation {
  messages: Message[];
}

// Message Types
export interface SendMessageRequest {
  content: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    url?: string;
  }>;
  options?: {
    webSearch?: boolean;
    audio?: boolean;
    music?: boolean;
  };
}

export interface MessageWithRelations extends Message {
  conversation: Conversation;
  user: User;
}

export interface PaginationOptions {
  page?: number | undefined;
  limit?: number | undefined;
  before?: Date | undefined;
}

// Project Change Types
export interface CreateProjectChangeRequest {
  version: string;
  diff: Record<string, any>; // jsondiffpatch delta representing changes from previous mainState
  actionDescription?: string;
  clientHash?: string;
}

export interface ApplyProjectChangeRequest extends CreateProjectChangeRequest {}

export interface RollforwardRequest {
  steps?: number; // number of changes to roll forward
}

export interface ProjectChangeWithRelations extends ProjectChange {
  project: Project;
  author: Pick<User, 'id' | 'name' | 'email'>;
}

// Snapshot Types
export interface CreateSnapshotRequest {
  version: string;
  state: Record<string, any>;
}

export interface SnapshotWithRelations extends Snapshot {
  project: Project;
}

// Project Role Types
export interface CreateProjectRoleRequest {
  userId: string;
  role: 'editor' | 'viewer' | 'admin';
}

export interface UpdateProjectRoleRequest {
  role?: 'editor' | 'viewer' | 'admin';
  status?: 'pending' | 'accepted' | 'declined';
}

export interface ProjectRoleWithRelations extends ProjectRole {
  project: Project;
  user: Pick<User, 'id' | 'name' | 'email' | 'createdAt' | 'updatedAt'>;
}

// Version Control Types
export interface VersionInfo {
  version: string;
  timestamp: Date;
  authorId: string;
  authorName: string;
  actionDescription?: string;
}

export interface ProjectHistory {
  project: Project;
  changes: VersionInfo[];
  snapshots: VersionInfo[];
}

// Project Data Structure Types (new separated mainState and configuration approach)
export * from './project'; 

// DSL types
export type { 
  Action, 
  ActionProgram, 
  Group, 
  Rect, 
  TextEl, 
  CodeEditorEl,
  VideoTimelineConfig,
  CaptionConfig,
  AnimationPack,
  AnimationPlan,
  // JSON-based types
  AnimationStep,
  JsonAnimationProgram,
  ListItem,
  // Demo section types
  DataStructure,
  DemoAction,
  DemoStep,
  DemoSection,
  // Content types
  ContentItem,
  // DSL Scene types
  DSLSceneStructure,
} from './dsl';

// Canvas types
export type {
  TimelineAnimation,
  CanvasElement,
  CanvasGroup,
  Scene,
  SceneCanvas,
  PlaybackConfig,
  MainState,
  ProjectDocument
} from './canvas';

// Procedural types
export * from './procedural';

// LLM types
export * from './llm';

// Utility types
export interface BatchDeleteRequest {
  ids: string[];
}