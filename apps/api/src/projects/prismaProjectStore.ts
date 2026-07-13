import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateProjectRequest,
  CreateMilestoneRequest,
  CreateAssignmentRequest,
  Project,
  ProjectActivity,
  ProjectMilestone,
  UpdateProjectRequest,
  UpdateMilestoneRequest
} from '@construction-crm/shared-types';
import type { ProjectListStoreQuery, ProjectStore } from './projectStore.js';

function toProject(row: {
  id: string;
  leadId: string | null;
  quotationId: string | null;
  name: string;
  clientName: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: Prisma.Decimal;
  address: string | null;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  milestones?: {
    id: string;
    projectId: string;
    title: string;
    dueDate: Date | null;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
  }[];
  assignments?: {
    id: string;
    projectId: string;
    userId: string;
    roleOnProject: string;
    createdAt: Date;
    user?: { name: string };
  }[];
}): Project {
  return {
    id: row.id,
    leadId: row.leadId,
    quotationId: row.quotationId,
    name: row.name,
    clientName: row.clientName,
    status: row.status as Project['status'],
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    budget: Number(row.budget),
    spent: 0, // will be computed from expenses in Phase 6
    address: row.address,
    progress: row.progress,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    milestones: (row.milestones ?? []).map((m) => ({
      id: m.id,
      projectId: m.projectId,
      title: m.title,
      dueDate: m.dueDate?.toISOString() ?? null,
      status: m.status as ProjectMilestone['status'],
      completedAt: m.completedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString()
    })),
    assignments: (row.assignments ?? []).map((a) => ({
      id: a.id,
      projectId: a.projectId,
      userId: a.userId,
      userName: a.user?.name ?? null,
      roleOnProject: a.roleOnProject,
      createdAt: a.createdAt.toISOString()
    }))
  };
}

const defaultInclude = {
  milestones: { orderBy: { createdAt: 'asc' as const } },
  assignments: { include: { user: { select: { name: true } } } }
};

export class PrismaProjectStore implements ProjectStore {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ProjectListStoreQuery) {
    const where: Prisma.ProjectWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.visibleUserId
        ? { assignments: { some: { userId: query.visibleUserId } } }
        : {})
    };

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prisma.project.count({ where })
    ]);

    return { projects: rows.map(toProject), total };
  }

  async findById(id: string) {
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: defaultInclude
    });
    return row ? toProject(row) : null;
  }

  async create(input: CreateProjectRequest) {
    const row = await this.prisma.project.create({
      data: {
        name: input.name,
        clientName: input.clientName,
        leadId: input.leadId ?? null,
        quotationId: input.quotationId ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        budget: input.budget ?? 0,
        address: input.address ?? null
      },
      include: defaultInclude
    });
    return toProject(row);
  }

  async update(id: string, input: UpdateProjectRequest) {
    try {
      const data: Prisma.ProjectUpdateInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.clientName !== undefined) data.clientName = input.clientName;
      if (input.status !== undefined) data.status = input.status;
      if (input.startDate !== undefined) data.startDate = input.startDate ? new Date(input.startDate) : null;
      if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null;
      if (input.budget !== undefined) data.budget = input.budget;
      if (input.address !== undefined) data.address = input.address;
      if (input.progress !== undefined) data.progress = input.progress;

      const row = await this.prisma.project.update({
        where: { id },
        data,
        include: defaultInclude
      });
      return toProject(row);
    } catch {
      return null;
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.project.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async addMilestone(projectId: string, input: CreateMilestoneRequest) {
    const row = await this.prisma.projectMilestone.create({
      data: {
        projectId,
        title: input.title,
        dueDate: input.dueDate ? new Date(input.dueDate) : null
      }
    });
    return {
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      dueDate: row.dueDate?.toISOString() ?? null,
      status: row.status as ProjectMilestone['status'],
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    };
  }

  async updateMilestone(id: string, input: UpdateMilestoneRequest) {
    try {
      const data: Prisma.ProjectMilestoneUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      if (input.status !== undefined) {
        data.status = input.status;
        if (input.status === 'completed') data.completedAt = new Date();
        else data.completedAt = null;
      }
      const row = await this.prisma.projectMilestone.update({ where: { id }, data });
      return {
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        dueDate: row.dueDate?.toISOString() ?? null,
        status: row.status as ProjectMilestone['status'],
        completedAt: row.completedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString()
      };
    } catch {
      return null;
    }
  }

  async deleteMilestone(id: string) {
    try {
      await this.prisma.projectMilestone.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async addAssignment(projectId: string, input: CreateAssignmentRequest) {
    const row = await this.prisma.projectAssignment.create({
      data: {
        projectId,
        userId: input.userId,
        roleOnProject: input.roleOnProject
      },
      include: { user: { select: { name: true } } }
    });
    return {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      userName: row.user?.name ?? null,
      roleOnProject: row.roleOnProject,
      createdAt: row.createdAt.toISOString()
    };
  }

  async removeAssignment(id: string) {
    try {
      await this.prisma.projectAssignment.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async activities(projectId: string) {
    const rows = await this.prisma.activityLog.findMany({
      where: { entityType: 'project', entityId: projectId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(
      (row): ProjectActivity => ({
        id: row.id,
        userName: row.user?.name ?? null,
        action: row.action,
        entityType: 'project',
        entityId: row.entityId,
        metadata: row.metadataJson as Record<string, unknown>,
        createdAt: row.createdAt.toISOString()
      })
    );
  }

  async addActivity(input: { userId: string | null; action: string; entityId: string; metadata: Record<string, unknown> }) {
    await this.prisma.activityLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: 'project',
        entityId: input.entityId,
        metadataJson: input.metadata as Prisma.InputJsonObject
      }
    });
  }
}
