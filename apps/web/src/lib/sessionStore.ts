import { create } from 'zustand';
import type { AuthUser } from '@construction-crm/shared-types';
import { login, logout, refreshSession, registerOwner } from './api';

type SessionState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  registerFirstOwner: (email: string, name: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  loading: true,
  error: null,
  async bootstrap() {
    try {
      const response = await refreshSession();
      set({ user: response.user, loading: false, error: null });
    } catch {
      set({ user: null, loading: false, error: null });
    }
  },
  async loginUser(email, password) {
    set({ error: null });
    try {
      const response = await login({ email, password });
      set({ user: response.user, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to log in' });
      throw error;
    }
  },
  async registerFirstOwner(email, name, password) {
    set({ error: null });
    try {
      const response = await registerOwner({ email, name, password });
      set({ user: response.user, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to create owner' });
      throw error;
    }
  },
  async logoutUser() {
    await logout();
    set({ user: null });
  }
}));
