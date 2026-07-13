import type { AuthUser } from '@construction-crm/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
