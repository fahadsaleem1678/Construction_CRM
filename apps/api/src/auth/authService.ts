import type {
  AcceptInviteRequest,
  AuthResponse,
  InviteUserRequest,
  LoginRequest,
  RegisterOwnerRequest
} from '@construction-crm/shared-types';
import { AppError, forbidden, unauthorized } from './errors.js';
import { createOpaqueToken, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';
import { hashPassword, verifyPassword } from './passwords.js';
import type { StoredUser, UserStore } from './userStore.js';
import {
  createSupabaseUser,
  inviteSupabaseUser,
  isSupabaseAuthEnabled,
  refreshSupabaseSession,
  requestSupabasePasswordReset,
  signInWithSupabase
} from './supabaseAuth.js';

const inviteLifetimeMs = 1000 * 60 * 60 * 24 * 7;
const resetLifetimeMs = 1000 * 60 * 60;

function toPublicUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  };
}

function sessionFor(user: StoredUser): AuthResponse & { refreshToken: string } {
  const publicUser = toPublicUser(user);
  return {
    user: publicUser,
    accessToken: signAccessToken(publicUser),
    refreshToken: signRefreshToken(user.id, user.refreshTokenVersion)
  };
}

function roleFromSupabase(value: unknown): StoredUser['role'] {
  if (value === 'owner' || value === 'admin' || value === 'manager' || value === 'employee' || value === 'accountant') {
    return value;
  }
  return 'employee';
}

export class AuthService {
  constructor(private readonly store: UserStore) {}

  async registerOwner(input: RegisterOwnerRequest) {
    const userCount = await this.store.countUsers();
    if (userCount > 0) {
      throw forbidden('The owner account already exists. Ask an owner or admin for an invite.');
    }

    if (isSupabaseAuthEnabled()) {
      await createSupabaseUser({ email: input.email, password: input.password, name: input.name, role: 'owner' });
      const user = await this.store.createUser({
        email: input.email,
        name: input.name,
        role: 'owner',
        passwordHash: 'supabase-managed',
        emailVerified: true
      });
      const session = await signInWithSupabase(input.email, input.password);
      return { user: toPublicUser(user), accessToken: session.accessToken, refreshToken: session.refreshToken };
    }

    const user = await this.store.createUser({
      email: input.email,
      name: input.name,
      role: 'owner',
      passwordHash: await hashPassword(input.password),
      emailVerified: true
    });

    return sessionFor(user);
  }

  async login(input: LoginRequest) {
    if (isSupabaseAuthEnabled()) {
      const session = await signInWithSupabase(input.email, input.password);
      const email = session.user.email ?? input.email;
      let user = await this.store.findUserByEmail(email);
      if (!user) {
        user = await this.store.createUser({
          email,
          name: String(session.user.user_metadata.name ?? email),
          role: roleFromSupabase(session.user.app_metadata.role),
          passwordHash: 'supabase-managed',
          emailVerified: true
        });
      }
      return { user: toPublicUser(user), accessToken: session.accessToken, refreshToken: session.refreshToken };
    }

    const user = await this.store.findUserByEmail(input.email);
    if (!user || !user.isActive) {
      throw unauthorized('Invalid email or password');
    }

    const passwordOk = await verifyPassword(input.password, user.passwordHash);
    if (!passwordOk) {
      throw unauthorized('Invalid email or password');
    }

    return sessionFor(user);
  }

  async inviteUser(input: InviteUserRequest, invitedByUserId: string) {
    const inviter = await this.store.findUserById(invitedByUserId);
    if (!inviter || !['owner', 'admin'].includes(inviter.role)) {
      throw forbidden('Only owners and admins can invite users');
    }

    const existingUser = await this.store.findUserByEmail(input.email);
    if (existingUser) {
      throw new AppError(409, 'A user with this email already exists');
    }

    const token = createOpaqueToken();
    if (isSupabaseAuthEnabled()) {
      await inviteSupabaseUser(input.email, input.name, input.role);
      const invitation = await this.store.createInvitation({
        email: input.email,
        name: input.name,
        role: input.role,
        tokenHash: hashToken(token),
        invitedBy: inviter.id,
        expiresAt: new Date(Date.now() + inviteLifetimeMs)
      });
      return {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        },
        inviteToken: null,
        providerInviteSent: true
      };
    }

    const invitation = await this.store.createInvitation({
      email: input.email,
      name: input.name,
      role: input.role,
      tokenHash: hashToken(token),
      invitedBy: inviter.id,
      expiresAt: new Date(Date.now() + inviteLifetimeMs)
    });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      },
      inviteToken: token
    };
  }

  async acceptInvite(input: AcceptInviteRequest) {
    const invitation = await this.store.findInvitationByTokenHash(hashToken(input.token));
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new AppError(400, 'This invitation is invalid or expired');
    }

    const user = await this.store.createUser({
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      passwordHash: await hashPassword(input.password),
      emailVerified: true
    });

    await this.store.markInvitationAccepted(invitation.id);
    return sessionFor(user);
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw unauthorized();
    }

    if (isSupabaseAuthEnabled()) {
      const session = await refreshSupabaseSession(refreshToken);
      const email = session.user.email;
      if (!email) throw unauthorized();
      const user = await this.store.findUserByEmail(email);
      if (!user || !user.isActive) throw unauthorized();
      return { user: toPublicUser(user), accessToken: session.accessToken, refreshToken: session.refreshToken };
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await this.store.findUserById(payload.sub);
      if (!user || !user.isActive || user.refreshTokenVersion !== payload.version) {
        throw unauthorized();
      }
      return sessionFor(user);
    } catch {
      throw unauthorized();
    }
  }

  async logout(userId: string) {
    await this.store.bumpRefreshVersion(userId);
  }

  async requestPasswordReset(email: string) {
    if (isSupabaseAuthEnabled()) {
      await requestSupabasePasswordReset(email);
      return { resetToken: null };
    }

    const user = await this.store.findUserByEmail(email);
    if (!user) {
      return { resetToken: null };
    }

    const token = createOpaqueToken();
    await this.store.createPasswordReset({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + resetLifetimeMs)
    });

    return { resetToken: token };
  }

  async resetPassword(token: string, password: string) {
    const reset = await this.store.findPasswordResetByTokenHash(hashToken(token));
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new AppError(400, 'This password reset link is invalid or expired');
    }

    await this.store.updatePassword(reset.userId, await hashPassword(password));
    await this.store.markPasswordResetUsed(reset.id);
  }
}
