import crypto from 'node:crypto';
import type {
  CreateProjectRequest,
  CreateMilestoneRequest,
  CreateAssignmentRequest,
  Project,
  ProjectActivity,
  ProjectAssignment,
  ProjectMilestone,
  UpdateProjectRequest,
  UpdateMilestoneRequest
} from '@construction-crm/shared-types';
import type { ProjectListStoreQuery, ProjectStore } from './projectStore.js';

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export class InMemoryProjectStore implements ProjectStore {
  projects = new Map<string, Project>();
  milestones = new Map<string, ProjectMilestone>();
  assignments = new Map<string, ProjectAssignment>();
  activityRows: ProjectActivity[] = [];

  async list(query: ProjectListStoreQuery) {
    let projects = [...this.projects.values()];
    if (query.visibleUserId) {
      const assignedProjectIds = new Set(
        [...this.assignments.values()]
          .filter((a) => a.userId === query.visibleUserId)
          .map((a) => a.projectId)
      );
      projects = projects.filter((p) => assignedProjectIds.has(p.id));
    }
    if (query.status) projects = projects.filter((p) => p.status === query.status);
    projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = projects.length;
    const start = (query.page - 1) * query.pageSize;
    return { projects: projects.slice(start, start + query.pageSize), total };
  }

  async findById(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) return null;
    return {
      ...project,
      milestones: [...this.milestones.values()].filter((m) => m.projectId === projectId),
      assignments: [...this.assignments.values()].filter((a) => a.projectId === projectId)
    };
  }

  async create(input: CreateProjectRequest) {
    const project: Project = {
      id: id(),
      name: input.name,
      clientName: input.clientName,
      leadId: input.leadId ?? null,
      quotationId: input.quotationId ?? null,
      status: 'planning',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      budget: input.budget ?? 0,
      spent: 0,
      address: input.address ?? null,
      progress: 0,
      createdAt: now(),
      updatedAt: now(),
      milestones: [],
      assignments: []
    };
    this.projects.set(project.id, project);
    return project;
  }

  async update(projectId: string, input: UpdateProjectRequest) {
    const existing = this.projects.get(projectId);
    if (!existing) return null;
    const next: Project = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.budget !== undefined ? { budget: input.budget } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.progress !== undefined ? { progress: input.progress } : {}),
      updatedAt: now(),
      milestones: [...this.milestones.values()].filter((m) => m.projectId === projectId),
      assignments: [...this.assignments.values()].filter((a) => a.projectId === projectId)
    };
    this.projects.set(projectId, next);
    return next;
  }

  async delete(projectId: string) {
    if (!this.projects.has(projectId)) return false;
    this.projects.delete(projectId);
    for (const [k, v] of this.milestones) if (v.projectId === projectId) this.milestones.delete(k);
    for (const [k, v] of this.assignments) if (v.projectId === projectId) this.assignments.delete(k);
    return true;
  }

  async addMilestone(projectId: string, input: CreateMilestoneRequest) {
    const milestone: ProjectMilestone = {
      id: id(),
      projectId,
      title: input.title,
      dueDate: input.dueDate ?? null,
      status: 'pending',
      completedAt: null,
      createdAt: now()
    };
    this.milestones.set(milestone.id, milestone);
    return milestone;
  }

  async updateMilestone(milestoneId: string, input: UpdateMilestoneRequest) {
    const existing = this.milestones.get(milestoneId);
    if (!existing) return null;
    const next: ProjectMilestone = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate ?? null } : {}),
      ...(input.status !== undefined
        ? {
            status: input.status,
            completedAt: input.status === 'completed' ? now() : null
          }
        : {})
    };
    this.milestones.set(milestoneId, next);
    return next;
  }

  async deleteMilestone(milestoneId: string) {
    return this.milestones.delete(milestoneId);
  }

  async addAssignment(projectId: string, input: CreateAssignmentRequest) {
    const assignment: ProjectAssignment = {
      id: id(),
      projectId,
      userId: input.userId,
      userName: null,
      roleOnProject: input.roleOnProject,
      createdAt: now()
    };
    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  async removeAssignment(assignmentId: string) {
    return this.assignments.delete(assignmentId);
  }

  async activities(projectId: string) {
    return this.activityRows.filter((a) => a.entityId === projectId).slice().reverse();
  }

  async addActivity(input: { userId: string | null; action: string; entityId: string; metadata: Record<string, unknown> }) {
    this.activityRows.push({
      id: id(),
      userName: input.userId,
      action: input.action,
      entityType: 'project',
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: now()
    });
  }
}
