import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../auth/errors.js';
import { verifyAccessToken } from '../auth/tokens.js';
import type { UserStore } from '../auth/userStore.js';
import { getSupabaseUser, isSupabaseAuthEnabled } from '../auth/supabaseAuth.js';

export function authenticate(store: UserStore) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

    if (!token) {
      next(unauthorized());
      return;
    }

    try {
      if (isSupabaseAuthEnabled()) {
        const supabaseUser = await getSupabaseUser(token);
        const user = await store.findUserByEmail(supabaseUser.email!);
        if (!user || !user.isActive) {
          next(unauthorized());
          return;
        }

        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        };
        next();
        return;
      }

      const payload = verifyAccessToken(token);
      const user = await store.findUserById(payload.sub);
      if (!user || !user.isActive) {
        next(unauthorized());
        return;
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      };
      next();
    } catch {
      next(unauthorized());
    }
  };
}
