import type { Response } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function parsePaginationQuery(
  rawPage: unknown,
  rawLimit: unknown,
  options?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams {
  const defaultLimit = options?.defaultLimit ?? 20;
  const maxLimit = options?.maxLimit ?? 100;

  return {
    page: parsePage(rawPage),
    limit: parseLimit(rawLimit, defaultLimit, maxLimit)
  };
}

export function applyPaginationHeaders(response: Response, pagination: Omit<PaginatedResult<unknown>, 'items'>) {
  response.setHeader('X-Page', String(pagination.page));
  response.setHeader('X-Per-Page', String(pagination.limit));
  response.setHeader('X-Total-Count', String(pagination.total));
  response.setHeader('X-Total-Pages', String(Math.max(1, Math.ceil(pagination.total / pagination.limit))));
}

function parsePage(rawPage: unknown) {
  const parsed = Number(rawPage);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
}

function parseLimit(rawLimit: unknown, defaultLimit: number, maxLimit: number) {
  const parsed = Number(rawLimit);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(Math.floor(parsed), maxLimit);
}
