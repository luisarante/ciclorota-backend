import type { AdminView } from '../types/admin';

export const ADMIN_ROUTE_BY_VIEW: Record<AdminView, string> = {
  overview: '/overview',
  users: '/users',
  checkpoints: '/checkpoints',
  checkins: '/checkins',
  certificates: '/certificates'
};

export const LOGIN_ROUTE = '/login';
export const DEFAULT_ADMIN_ROUTE = ADMIN_ROUTE_BY_VIEW.overview;

export function buildAdminUserPath(userId: string) {
  return `/users/${userId}`;
}

export function buildLoginPath(nextPath?: string | null) {
  const normalizedNextPath = sanitizeNextPath(nextPath);

  if (!normalizedNextPath) {
    return LOGIN_ROUTE;
  }

  const params = new URLSearchParams({ next: normalizedNextPath });
  return `${LOGIN_ROUTE}?${params.toString()}`;
}

export function resolveAdminView(pathname: string): AdminView | null {
  if (pathname === ADMIN_ROUTE_BY_VIEW.overview) {
    return 'overview';
  }

  if (pathname === ADMIN_ROUTE_BY_VIEW.users || /^\/users\/[^/]+$/.test(pathname)) {
    return 'users';
  }

  if (pathname === ADMIN_ROUTE_BY_VIEW.checkpoints) {
    return 'checkpoints';
  }

  if (pathname === ADMIN_ROUTE_BY_VIEW.checkins) {
    return 'checkins';
  }

  if (pathname === ADMIN_ROUTE_BY_VIEW.certificates) {
    return 'certificates';
  }

  return null;
}

export function getAdminUserIdFromPath(pathname: string) {
  const match = pathname.match(/^\/users\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function sanitizeNextPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  if (value === LOGIN_ROUTE || value.startsWith(`${LOGIN_ROUTE}?`)) {
    return null;
  }

  return value;
}
