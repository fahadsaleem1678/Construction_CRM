import type { PrismaClient } from '@prisma/client';
import type { AuthUser, UserRole } from '@construction-crm/shared-types';
import type {
  CreateUserInput,
  StoredInvitation,
  StoredPasswordReset,
  StoredUser,
  UserStore
} from './userStore.js';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toAuthRole(role: string): UserRole {
  return role as UserRole;
}

function toUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  passwordHash: string;
  emailVerified: boolean;
  refreshTokenVersion: number;
}): StoredUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: toAuthRole(user.role),
    isActive: user.isActive,
    passwordHash: user.passwordHash,
    emailVerified: user.emailVerified,
    refreshTokenVersion: user.refreshTokenVersion
  };
}

function toInvitation(invitation: {
  id: string;
  email: string;
  name: string;
  role: string;
  tokenHash: string;
  invitedBy: string;
  acceptedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}): StoredInvitation {
  return {
    ...invitation,
    role: invitation.role as Exclude<AuthUser['role'], 'owner'>
  };
}

export class PrismaUserStore implements UserStore {
  constructor(private readonly prisma: PrismaClient) {}

  countUsers() {
    return this.prisma.user.count();
  }

  async findUserByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizeEmail(email),
          mode: 'insensitive'
        }
      }
    });
    return user ? toUser(user) : null;
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toUser(user) : null;
  }

  async createUser(input: CreateUserInput) {
    const user = await this.prisma.user.create({
      data: {
        ...input,
        email: normalizeEmail(input.email)
      }
    });
    return toUser(user);
  }

  async bumpRefreshVersion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenVersion: { increment: 1 } }
    });
  }

  async createInvitation(input: Omit<StoredInvitation, 'id' | 'acceptedAt' | 'createdAt'>) {
    const invitation = await this.prisma.userInvitation.create({
      data: {
        ...input,
        email: normalizeEmail(input.email)
      }
    });
    return toInvitation(invitation);
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const invitation = await this.prisma.userInvitation.findUnique({ where: { tokenHash } });
    return invitation ? toInvitation(invitation) : null;
  }

  async markInvitationAccepted(invitationId: string) {
    await this.prisma.userInvitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() }
    });
  }

  async createPasswordReset(input: Omit<StoredPasswordReset, 'id' | 'usedAt' | 'createdAt'>) {
    return this.prisma.passwordResetToken.create({ data: input });
  }

  async findPasswordResetByTokenHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  async markPasswordResetUsed(resetId: string) {
    await this.prisma.passwordResetToken.update({ where: { id: resetId }, data: { usedAt: new Date() } });
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, refreshTokenVersion: { increment: 1 } }
    });
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });
    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive
    }));
  }
}
