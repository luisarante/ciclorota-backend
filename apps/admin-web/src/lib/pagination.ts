import type { PaginationMeta } from '@ciclorota/shared';

export function createEmptyPagination(): PaginationMeta {
  return {
    page: 1,
    per_page: 0,
    total_count: 0,
    total_pages: 1
  };
}

export function createPaginationFromLength(length: number, limit: number, page = 1): PaginationMeta {
  return {
    page,
    per_page: limit,
    total_count: length,
    total_pages: Math.max(1, Math.ceil(length / limit))
  };
}

export function parsePaginationHeaders(headers: Headers): PaginationMeta | null {
  const totalCount = headers.get('x-total-count');

  if (!totalCount) {
    return null;
  }

  return {
    page: Number(headers.get('x-page') ?? '1'),
    per_page: Number(headers.get('x-per-page') ?? '0'),
    total_count: Number(totalCount),
    total_pages: Number(headers.get('x-total-pages') ?? '1')
  };
}
