import type { AppRole } from '../config/admin.js';

export interface AuthContext {
  userId: string;
  email: string | null;
  accessToken: string;
  role: AppRole;
  isAdmin: boolean;
}

export interface AuthUserResponse {
  id: string;
  email: string | null;
  role: AppRole;
  is_admin: boolean;
}

export interface AuthSessionResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  expires_in: number | null;
  token_type: string;
}
