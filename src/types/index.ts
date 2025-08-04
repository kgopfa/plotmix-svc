import { Request } from 'express';
import { User as PrismaUser, Project as PrismaProject, ProjectChange as PrismaProjectChange, Snapshot as PrismaSnapshot, ProjectRole as PrismaProjectRole } from '@prisma/client';

export type User = PrismaUser;
export type Project = PrismaProject;
export type ProjectChange = PrismaProjectChange;
export type Snapshot = PrismaSnapshot;
export type ProjectRole = PrismaProjectRole;

export interface JWTPayload {
  // NextAuth JWT token structure
  sub?: string; // User ID (NextAuth uses 'sub')
  id?: string; // Alternative user ID field
  userId?: string; // Legacy user ID field
  email: string;
  name?: string;
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
  mainState: Record<string, any>;
}

export interface UpdateProjectRequest {
  name?: string;
  mainState?: Record<string, any>;
}

export interface ProjectWithRelations extends Project {
  owner: User;
  changes: ProjectChange[];
  snapshots: Snapshot[];
  collaborators: ProjectRole[];
}

// Project Change Types
export interface CreateProjectChangeRequest {
  version: string;
  diff: Record<string, any>;
  actionDescription?: string;
  clientHash?: string;
}

export interface ProjectChangeWithRelations extends ProjectChange {
  project: Project;
  author: User;
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
  user: User;
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