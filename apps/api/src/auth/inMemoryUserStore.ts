import crypto from 'node:crypto';
import type {
  CreateUserInput,
  StoredInvitation,
  StoredPasswordReset,
  StoredUser,
  UserStore
} from './userStore.js';

const id = () => crypto.randomUUID();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class InMemoryUserStore implements UserStore {
  users = new Map<string, StoredUser>();
  invitations = new Map<string, StoredInvitation>();
  passwordResets = new Map<string, StoredPasswordReset>();

  async countUsers() {
    return this.users.size;
  }

  async findUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return [...this.users.values()].find((user) => user.email === normalized) ?? null;
  }

  async findUserById(userId: string) {
    return this.users.get(userId) ?? null;
  }

  async createUser(input: CreateUserInput) {
    const user: StoredUser = {
      id: id(),
      ...input,
      email: normalizeEmail(input.email),
      isActive: true,
      refreshTokenVersion: 0
    };
    this.users.set(user.id, user);
    return user;
  }

  async bumpRefreshVersion(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.refreshTokenVersion += 1;
    }
  }

  async createInvitation(input: Omit<StoredInvitation, 'id' | 'acceptedAt' | 'createdAt'>) {
    const invitation: StoredInvitation = {
      id: id(),
      ...input,
      email: normalizeEmail(input.email),
      acceptedAt: null,
      createdAt: new Date()
    };
    this.invitations.set(invitation.id, invitation);
    return invitation;
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return [...this.invitations.values()].find((invitation) => invitation.tokenHash === tokenHash) ?? null;
  }

  async markInvitationAccepted(invitationId: string) {
    const invitation = this.invitations.get(invitationId);
    if (invitation) {
      invitation.acceptedAt = new Date();
    }
  }

  async createPasswordReset(input: Omit<StoredPasswordReset, 'id' | 'usedAt' | 'createdAt'>) {
    const reset: StoredPasswordReset = {
      id: id(),
      ...input,
      usedAt: null,
      createdAt: new Date()
    };
    this.passwordResets.set(reset.id, reset);
    return reset;
  }

  async findPasswordResetByTokenHash(tokenHash: string) {
    return [...this.passwordResets.values()].find((reset) => reset.tokenHash === tokenHash) ?? null;
  }

  async markPasswordResetUsed(resetId: string) {
    const reset = this.passwordResets.get(resetId);
    if (reset) {
      reset.usedAt = new Date();
    }
  }

  async updatePassword(userId: string, passwordHash: string) {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
      user.refreshTokenVersion += 1;
    }
  }

  async listUsers() {
    return [...this.users.values()]
      .filter((user) => user.isActive)
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive
      }));
  }
}
