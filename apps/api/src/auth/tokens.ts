import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AuthUser } from '@construction-crm/shared-types';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: AuthUser['role'];
  name: string;
};

export type RefreshTokenPayload = {
  sub: string;
  version: number;
};

export function signAccessToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name } satisfies AccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

export function signRefreshToken(userId: string, version: number) {
  return jwt.sign({ sub: userId, version } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
