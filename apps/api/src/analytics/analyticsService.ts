import type { AuthUser } from '@construction-crm/shared-types';
import type { AnalyticsStore } from './analyticsStore.js';

export class AnalyticsService {
  constructor(private readonly analytics: AnalyticsStore) {}

  async getDashboard(user: AuthUser, months: number) {
    return this.analytics.getDashboard({
      viewerId: user.id,
      viewerRole: user.role,
      months,
    });
  }
}
