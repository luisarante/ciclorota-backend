import type { AuthSessionPayload } from '@ciclorota/shared';
import { requestJson } from '../lib/api';

export function fetchAuthMe(accessToken: string) {
  return requestJson<AuthSessionPayload>('/auth/me', { accessToken });
}
