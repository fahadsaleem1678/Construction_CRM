import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { UserRole } from '@construction-crm/shared-types';
import { AppError, unauthorized } from './errors.js';
import { env } from '../config/env.js';

export type SupabaseSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

function requireSupabaseEnv() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(500, 'Supabase auth is enabled but server credentials are missing');
  }
}

let adminClient: SupabaseClient | null = null;

export function isSupabaseAuthEnabled() {
  return env.SUPABASE_AUTH_ENABLED;
}

export function getSupabaseAdmin() {
  requireSupabaseEnv();
  adminClient ??= createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return adminClient;
}

export async function createSupabaseUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}) {
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
    app_metadata: { role: input.role }
  });
  if (error || !data.user) throw new AppError(400, error?.message ?? 'Unable to create Supabase user');
  return data.user;
}

export async function signInWithSupabase(email: string, password: string): Promise<SupabaseSession> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new AppError(500, 'Supabase auth is enabled but client credentials are missing');
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw unauthorized('Invalid email or password');
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user
  };
}

export async function refreshSupabaseSession(refreshToken: string): Promise<SupabaseSession> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new AppError(500, 'Supabase auth is enabled but client credentials are missing');
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) throw unauthorized();
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user
  };
}

export async function getSupabaseUser(accessToken: string) {
  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user?.email) throw unauthorized();
  return data.user;
}

export async function inviteSupabaseUser(email: string, name: string, role: Exclude<UserRole, 'owner'>) {
  const { data, error } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${env.APP_ORIGIN}/accept-invite`
  });
  if (error) throw new AppError(400, error.message);
  if (data.user?.id) {
    await getSupabaseAdmin().auth.admin.updateUserById(data.user.id, {
      app_metadata: { role }
    });
  }
  return data.user ?? null;
}

export async function requestSupabasePasswordReset(email: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new AppError(500, 'Supabase auth is enabled but client credentials are missing');
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_ORIGIN}/accept-invite`
  });
  if (error) throw new AppError(400, error.message);
}
