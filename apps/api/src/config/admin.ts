import type { User } from '@supabase/supabase-js';

export type AppRole = 'user' | 'admin' | 'superadmin';

export function resolveRoleFromUser(user: Pick<User, 'app_metadata' | 'user_metadata'>) {
  const appMetadataRole = normalizeRole(user.app_metadata?.role);

  if (appMetadataRole) {
    return appMetadataRole;
  }

  return normalizeRole(user.user_metadata?.role) ?? 'user';
}

export function resolveRoleFromMetadata(metadata: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) {
  const appMetadataRole = normalizeRole(metadata.app_metadata?.role);

  if (appMetadataRole) {
    return appMetadataRole;
  }

  return normalizeRole(metadata.user_metadata?.role) ?? 'user';
}

export function isAdminRole(role: AppRole) {
  return role === 'admin' || role === 'superadmin';
}

export function isSuperAdminRole(role: AppRole) {
  return role === 'superadmin';
}

export function canManageRole(actorRole: AppRole, targetRole: AppRole) {
  if (actorRole === 'superadmin') {
    return true;
  }

  return actorRole === 'admin' && targetRole === 'user';
}

export function canChangeRole(actorRole: AppRole) {
  return actorRole === 'superadmin';
}

function normalizeRole(value: unknown): AppRole | null {
  if (value === 'user' || value === 'admin' || value === 'superadmin') {
    return value;
  }

  return null;
}
