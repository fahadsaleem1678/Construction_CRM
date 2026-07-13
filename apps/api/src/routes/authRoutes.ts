import { Router } from 'express';
import type { AuthService } from '../auth/authService.js';
import {
  acceptInviteSchema,
  inviteSchema,
  loginSchema,
  registerOwnerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema
} from '../auth/schemas.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import type { UserStore } from '../auth/userStore.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth'
};

export function authRoutes(auth: AuthService, store: UserStore) {
  const router = Router();
  const requireUser = authenticate(store);

  router.post('/register-owner', async (req, res, next) => {
    try {
      const result = await auth.registerOwner(registerOwnerSchema.parse(req.body));
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(201).json({ user: result.user, accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const result = await auth.login(loginSchema.parse(req.body));
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.json({ user: result.user, accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const result = await auth.refresh(req.cookies.refreshToken as string | undefined);
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.json({ user: result.user, accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireUser, async (req, res, next) => {
    try {
      await auth.logout(req.user!.id);
      res.clearCookie('refreshToken', cookieOptions);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/invite', requireUser, authorize(['owner', 'admin']), async (req, res, next) => {
    try {
      const result = await auth.inviteUser(inviteSchema.parse(req.body), req.user!.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/accept-invite', async (req, res, next) => {
    try {
      const result = await auth.acceptInvite(acceptInviteSchema.parse(req.body));
      res.cookie('refreshToken', result.refreshToken, cookieOptions);
      res.status(201).json({ user: result.user, accessToken: result.accessToken });
    } catch (error) {
      next(error);
    }
  });

  router.post('/password-reset/request', async (req, res, next) => {
    try {
      const input = requestPasswordResetSchema.parse(req.body);
      const result = await auth.requestPasswordReset(input.email);
      res.json({
        message: 'If the email exists, a password reset link will be sent.',
        resetToken: process.env.NODE_ENV === 'production' ? undefined : result.resetToken
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/password-reset/confirm', async (req, res, next) => {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await auth.resetPassword(input.token, input.password);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireUser, (req, res) => {
    res.json({ user: req.user });
  });

  router.get('/users', requireUser, async (req, res, next) => {
    try {
      res.json(await store.listUsers());
    } catch (error) {
      next(error);
    }
  });

  return router;
}
