import type { AuthUser, UserRole } from '@construction-crm/shared-types';

export type StoredUser = AuthUser & {
  passwordHash: string;
  emailVerified: boolean;
  refreshTokenVersion: number;
};

export type StoredInvitation = {
  id: string;
  email: string;
  name: string;
  role: Exclude<UserRole, 'owner'>;
  tokenHash: string;
  invitedBy: string;
  acceptedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export type StoredPasswordReset = {
  id: string;
  userId: string;
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export type CreateUserInput = {
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  emailVerified: boolean;
};

export interface UserStore {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  createUser(input: CreateUserInput): Promise<StoredUser>;
  bumpRefreshVersion(userId: string): Promise<void>;
  createInvitation(input: Omit<StoredInvitation, 'id' | 'acceptedAt' | 'createdAt'>): Promise<StoredInvitation>;
  findInvitationByTokenHash(tokenHash: string): Promise<StoredInvitation | null>;
  markInvitationAccepted(invitationId: string): Promise<void>;
  createPasswordReset(input: Omit<StoredPasswordReset, 'id' | 'usedAt' | 'createdAt'>): Promise<StoredPasswordReset>;
  findPasswordResetByTokenHash(tokenHash: string): Promise<StoredPasswordReset | null>;
  markPasswordResetUsed(resetId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  listUsers(): Promise<AuthUser[]>;
}
