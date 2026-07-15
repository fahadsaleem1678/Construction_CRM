import type { DashboardAnalyticsResponse, UserRole } from '@construction-crm/shared-types';

export type DashboardAnalyticsQuery = {
  viewerId: string;
  viewerRole: UserRole;
  months: number;
};

export interface AnalyticsStore {
  getDashboard(query: DashboardAnalyticsQuery): Promise<DashboardAnalyticsResponse>;
}
