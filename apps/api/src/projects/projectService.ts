import type {
  AuthUser,
  CreateProjectRequest,
  CreateMilestoneRequest,
  CreateAssignmentRequest,
  ProjectListQuery,
  UpdateProjectRequest,
  UpdateMilestoneRequest,
  UpdateAssignmentRequest
} from '@construction-crm/shared-types';
import { AppError, forbidden } from '../auth/errors.js';
import type { QuotationStore } from '../quotations/quotationStore.js';
import type { LeadStore } from '../leads/leadStore.js';
import type { ProjectStore } from './projectStore.js';

const managers = ['owner', 'admin', 'manager'] as const;

function canManage(user: AuthUser) {
  return managers.includes(user.role as (typeof managers)[number]);
}

function canView(user: AuthUser) {
  return canManage(user) || user.role === 'accountant' || user.role === 'employee';
}

function canDelete(user: AuthUser) {
  return user.role === 'owner' || user.role === 'admin';
}

export class ProjectService {
  constructor(
    private readonly projects: ProjectStore,
    private readonly quotations: QuotationStore,
    private readonly leads: LeadStore,
  ) {}

  async list(query: Required<Pick<ProjectListQuery, 'page' | 'pageSize'>> & Omit<ProjectListQuery, 'page' | 'pageSize'>, user: AuthUser) {
    if (!canView(user)) throw forbidden('You do not have access to projects');

    const visibleUserId = user.role === 'employee' ? user.id : undefined;
    const { projects, total } = await this.projects.list({ ...query, visibleUserId });
    return {
      projects,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    };
  }

  async get(id: string, user: AuthUser) {
    if (!canView(user)) throw forbidden('You do not have access to projects');
    const project = await this.projects.findById(id);
    if (!project) throw new AppError(404, 'Project not found');

    if (user.role === 'employee') {
      const isAssigned = project.assignments.some((a) => a.userId === user.id);
      if (!isAssigned) throw forbidden('You can only view projects assigned to you');
    }

    const activities = await this.projects.activities(id);
    return { project, activities };
  }

  async create(input: CreateProjectRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can create projects');
    const project = await this.projects.create(input);
    await this.projects.addActivity({
      userId: user.id,
      action: 'project_created',
      entityId: project.id,
      metadata: { name: project.name, clientName: project.clientName }
    });
    return project;
  }

  async createFromQuotation(quotationId: string, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can create projects');

    const quotation = await this.quotations.findById(quotationId);
    if (!quotation) throw new AppError(404, 'Quotation not found');
    if (quotation.status !== 'accepted') {
      throw new AppError(400, 'Only accepted quotations can be converted to projects');
    }

    const lead = await this.leads.findById(quotation.leadId);

    const project = await this.projects.create({
      name: `Project - ${lead?.clientName ?? quotation.leadClientName ?? 'Unknown'}`,
      clientName: lead?.clientName ?? quotation.leadClientName ?? 'Unknown',
      leadId: quotation.leadId,
      quotationId: quotation.id,
      budget: quotation.total
    });

    // Update lead status to 'won'
    if (lead) {
      await this.leads.update(quotation.leadId, { status: 'won' });
      await this.leads.addActivity({
        userId: user.id,
        action: 'lead_won',
        entityId: quotation.leadId,
        metadata: { projectId: project.id, quotationId }
      });
    }

    await this.projects.addActivity({
      userId: user.id,
      action: 'project_created_from_quotation',
      entityId: project.id,
      metadata: { quotationId, quotationNumber: quotation.quotationNumber, budget: project.budget }
    });

    return project;
  }

  async update(id: string, input: UpdateProjectRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can update projects');
    const before = await this.projects.findById(id);
    if (!before) throw new AppError(404, 'Project not found');
    const project = await this.projects.update(id, input);
    if (!project) throw new AppError(404, 'Project not found');

    await this.projects.addActivity({
      userId: user.id,
      action: 'project_updated',
      entityId: project.id,
      metadata: {
        ...(input.status && input.status !== before.status ? { previousStatus: before.status, status: input.status } : {}),
        ...(input.progress !== undefined ? { progress: input.progress } : {})
      }
    });
    return project;
  }

  async remove(id: string, user: AuthUser) {
    if (!canDelete(user)) throw forbidden('Only owners and admins can delete projects');
    const deleted = await this.projects.delete(id);
    if (!deleted) throw new AppError(404, 'Project not found');
  }

  // ── Milestones ──────────────────────────────────────────────────

  async addMilestone(projectId: string, input: CreateMilestoneRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage milestones');
    const project = await this.projects.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    const milestone = await this.projects.addMilestone(projectId, input);
    await this.projects.addActivity({
      userId: user.id,
      action: 'milestone_added',
      entityId: projectId,
      metadata: { milestoneId: milestone.id, title: milestone.title }
    });
    return milestone;
  }

  async updateMilestone(projectId: string, milestoneId: string, input: UpdateMilestoneRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage milestones');
    const project = await this.projects.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    const milestone = await this.projects.updateMilestone(milestoneId, input);
    if (!milestone) throw new AppError(404, 'Milestone not found');
    await this.projects.addActivity({
      userId: user.id,
      action: 'milestone_updated',
      entityId: projectId,
      metadata: { milestoneId, ...(input.status ? { status: input.status } : {}) }
    });
    return milestone;
  }

  async removeMilestone(projectId: string, milestoneId: string, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage milestones');
    const deleted = await this.projects.deleteMilestone(milestoneId);
    if (!deleted) throw new AppError(404, 'Milestone not found');
  }

  // ── Assignments ─────────────────────────────────────────────────

  async addAssignment(projectId: string, input: CreateAssignmentRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage assignments');
    const project = await this.projects.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    const assignment = await this.projects.addAssignment(projectId, input);
    await this.projects.addActivity({
      userId: user.id,
      action: 'user_assigned',
      entityId: projectId,
      metadata: { assignedUserId: input.userId, roleOnProject: input.roleOnProject }
    });
    return assignment;
  }

  async removeAssignment(projectId: string, assignmentId: string, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage assignments');
    const deleted = await this.projects.removeAssignment(assignmentId);
    if (!deleted) throw new AppError(404, 'Assignment not found');
  }

  async updateAssignment(projectId: string, assignmentId: string, input: UpdateAssignmentRequest, user: AuthUser) {
    if (!canManage(user)) throw forbidden('Only owners, admins, and managers can manage assignments');
    const project = await this.projects.findById(projectId);
    if (!project) throw new AppError(404, 'Project not found');
    const assignment = await this.projects.updateAssignment(assignmentId, input);
    if (!assignment) throw new AppError(404, 'Assignment not found');
    await this.projects.addActivity({
      userId: user.id,
      action: 'assignment_updated',
      entityId: projectId,
      metadata: { assignmentId, ...(input.userId ? { assignedUserId: input.userId } : {}), ...(input.roleOnProject ? { roleOnProject: input.roleOnProject } : {}) }
    });
    return assignment;
  }
}
