import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@construction-crm/shared-types';
import { forbidden, unauthorized } from '../auth/errors.js';

export function authorize(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(forbidden());
      return;
    }

    next();
  };
}
