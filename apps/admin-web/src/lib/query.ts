import type { AdminCertificatesQuery, AdminCheckinsQuery, AdminUsersQuery } from '@ciclorota/shared';

export function buildUsersQueryString(query: AdminUsersQuery) {
  const params = new URLSearchParams();
  appendQueryParam(params, 'page', query.page);
  appendQueryParam(params, 'limit', query.limit);
  appendQueryParam(params, 'search', query.search);
  appendQueryParam(params, 'role', query.role);
  return params.toString();
}

export function buildCheckinsQueryString(query: AdminCheckinsQuery) {
  const params = new URLSearchParams();
  appendQueryParam(params, 'page', query.page);
  appendQueryParam(params, 'limit', query.limit);
  appendQueryParam(params, 'userId', query.userId);
  appendQueryParam(params, 'checkpointId', query.checkpointId);
  return params.toString();
}

export function buildCertificatesQueryString(query: AdminCertificatesQuery) {
  const params = new URLSearchParams();
  appendQueryParam(params, 'page', query.page);
  appendQueryParam(params, 'limit', query.limit);
  appendQueryParam(params, 'userId', query.userId);
  return params.toString();
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value === undefined || value === '') {
    return;
  }

  params.set(key, String(value));
}
