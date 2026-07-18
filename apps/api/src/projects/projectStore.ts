import type {
  CreateProjectRequest,
  CreateMilestoneRequest,
  CreateAssignmentRequest,
  Project,
  ProjectActivity,
  ProjectListQuery,
  UpdateProjectRequest,
  UpdateMilestoneRequest,
  ProjectMilestone,
  ProjectAssignment
} from '@construction-crm/shared-types';

export type ProjectListStoreQuery = Required<Pick<ProjectListQuery, 'page' | 'pageSize'>> &
  Omit<ProjectListQuery, 'page' | 'pageSize'> & {
    visibleUserId?: string;
  };

export interface ProjectStore {
  list(query: ProjectListStoreQuery): Promise<{ projects: Project[]; total: number }>;
  findById(id: string): Promise<Project | null>;
  create(input: CreateProjectRequest): Promise<Project>;
  update(id: string, input: UpdateProjectRequest): Promise<Project | null>;
  delete(id: string): Promise<boolean>;

  addMilestone(projectId: string, input: CreateMilestoneRequest): Promise<ProjectMilestone>;
  updateMilestone(id: string, input: UpdateMilestoneRequest): Promise<ProjectMilestone | null>;
  deleteMilestone(id: string): Promise<boolean>;

  addAssignment(projectId: string, input: CreateAssignmentRequest): Promise<ProjectAssignment>;
  updateAssignment(id: string, input: import('@construction-crm/shared-types').UpdateAssignmentRequest): Promise<ProjectAssignment | null>;
  removeAssignment(id: string): Promise<boolean>;

  activities(projectId: string): Promise<ProjectActivity[]>;
  addActivity(input: {
    userId: string | null;
    action: string;
    entityId: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}
