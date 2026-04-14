import type { AppRole, AuthUser } from '@ciclorota/shared';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import type { AdminSessionState } from '../types/admin';

export function toAdminSessionState(session: SupabaseSession): AdminSessionState {
  return {
    accessToken: session.access_token,
    user: toAuthUser(session.user)
  };
}

export function toAuthUser(user: SupabaseUser): AuthUser {
  const role = resolveAppRole(user);

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    is_admin: isAdminRole(role)
  };
}

export function resolveAppRole(user: SupabaseUser): AppRole {
  const appMetadataRole = user.app_metadata?.role;
  const userMetadataRole = user.user_metadata?.role;

  if (isAppRole(appMetadataRole)) {
    return appMetadataRole;
  }

  if (isAppRole(userMetadataRole)) {
    return userMetadataRole;
  }

  return 'user';
}

export function isAppRole(value: unknown): value is AppRole {
  return value === 'user' || value === 'admin' || value === 'superadmin';
}

export function isAdminRole(role: AppRole) {
  return role === 'admin' || role === 'superadmin';
}
