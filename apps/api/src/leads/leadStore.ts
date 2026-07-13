import type {
  CreateLeadRequest,
  Lead,
  LeadActivity,
  LeadListQuery,
  UpdateLeadRequest
} from '@construction-crm/shared-types';

export type LeadListStoreQuery = Required<Pick<LeadListQuery, 'page' | 'pageSize'>> &
  Omit<LeadListQuery, 'page' | 'pageSize'> & {
    visibleAssignedTo?: string;
  };

export interface LeadStore {
  list(query: LeadListStoreQuery): Promise<{ leads: Lead[]; total: number }>;
  findById(id: string): Promise<Lead | null>;
  create(input: CreateLeadRequest): Promise<Lead>;
  update(id: string, input: UpdateLeadRequest): Promise<Lead | null>;
  delete(id: string): Promise<boolean>;
  activities(leadId: string): Promise<LeadActivity[]>;
  addActivity(input: {
    userId: string | null;
    action: string;
    entityId: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}
