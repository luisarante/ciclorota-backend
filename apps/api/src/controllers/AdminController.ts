import { type Request, type Response } from 'express';
import type { AppRole } from '../config/admin.js';
import { AdminService } from '../services/AdminService.js';
import { getErrorMessage, getErrorStatus, HttpError } from '../utils/httpError.js';
import { applyPaginationHeaders, parsePaginationQuery } from '../utils/pagination.js';
import { isHttpUrl, isUuid, normalizeOptionalTrimmedString } from '../utils/validation.js';

export class AdminController {
  private readonly adminService = new AdminService();

  async overview(request: Request, response: Response): Promise<void> {
    try {
      const payload = await this.adminService.getOverview();
      response.json(payload);
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Erro ao carregar o overview do admin.' });
    }
  }

  async users(request: Request, response: Response): Promise<void> {
    try {
      const pagination = parsePaginationQuery(request.query.page, request.query.limit);
      const roleQuery = request.query.role;
      const role = parseRoleQuery(roleQuery);
      const search = parseStringQuery(request.query.search);

      if (roleQuery !== undefined && role === undefined) {
        response.status(400).json({ error: 'O filtro role precisa ser user, admin ou superadmin.' });
        return;
      }

      const payload = await this.adminService.listUsers({
        ...pagination,
        ...(role ? { role } : {}),
        ...(search ? { search } : {})
      });

      applyPaginationHeaders(response, payload);
      response.json(payload.items);
    } catch (error: any) {
      response.status(getErrorStatus(error, 500)).json({ error: getErrorMessage(error, 'Erro ao listar usuários do admin.') });
    }
  }

  async showUser(request: Request, response: Response): Promise<void> {
    try {
      const userId = normalizeRouteParam(request.params.userId);

      if (!userId || !isUuid(userId)) {
        response.status(400).json({ error: 'O userId precisa ser um UUID válido.' });
        return;
      }

      const user = await this.adminService.getUserById(userId);
      response.json(user);
    } catch (error: any) {
      response.status(getErrorStatus(error, 404)).json({ error: getErrorMessage(error, 'Erro ao buscar usuário do admin.') });
    }
  }

  async updateUser(request: Request, response: Response): Promise<void> {
    try {
      const userId = normalizeRouteParam(request.params.userId);

      if (!userId || !isUuid(userId)) {
        response.status(400).json({ error: 'O userId precisa ser um UUID válido.' });
        return;
      }

      const { role } = request.body ?? {};

      if (role !== undefined && !isAllowedRole(role)) {
        response.status(400).json({ error: 'O campo role precisa ser user, admin ou superadmin.' });
        return;
      }

      const normalizedPatch = normalizeAdminUserPatch(request.body ?? {});

      if (role === undefined && Object.keys(normalizedPatch).length === 0) {
        response.status(400).json({ error: 'Nenhum campo válido foi enviado para atualização.' });
        return;
      }

      const user = await this.adminService.updateUser(request.auth!, userId, {
        ...(role !== undefined ? { role } : {}),
        ...normalizedPatch
      });

      response.json(user);
    } catch (error: any) {
      response.status(getErrorStatus(error, 400)).json({ error: getErrorMessage(error, 'Erro ao atualizar usuário do admin.') });
    }
  }

  async checkins(request: Request, response: Response): Promise<void> {
    try {
      const pagination = parsePaginationQuery(request.query.page, request.query.limit);
      const userId = parseOptionalUuidQuery(request.query.userId, 'O filtro userId precisa ser um UUID válido.');
      const checkpointId = parseOptionalUuidQuery(request.query.checkpointId, 'O filtro checkpointId precisa ser um UUID válido.');
      const payload = await this.adminService.listRecentCheckins({
        ...pagination,
        ...(userId ? { userId } : {}),
        ...(checkpointId ? { checkpointId } : {})
      });
      applyPaginationHeaders(response, payload);
      response.json(payload.items);
    } catch (error: any) {
      response.status(getErrorStatus(error, 500)).json({ error: getErrorMessage(error, 'Erro ao listar check-ins do admin.') });
    }
  }

  async certificates(request: Request, response: Response): Promise<void> {
    try {
      const pagination = parsePaginationQuery(request.query.page, request.query.limit);
      const userId = parseOptionalUuidQuery(request.query.userId, 'O filtro userId precisa ser um UUID válido.');
      const payload = await this.adminService.listCertificates({
        ...pagination,
        ...(userId ? { userId } : {})
      });
      applyPaginationHeaders(response, payload);
      response.json(payload.items);
    } catch (error: any) {
      response.status(getErrorStatus(error, 500)).json({ error: getErrorMessage(error, 'Erro ao listar certificados do admin.') });
    }
  }
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isAllowedRole(value: unknown): value is AppRole {
  return value === 'user' || value === 'admin' || value === 'superadmin';
}

function parseRoleQuery(value: unknown) {
  return isAllowedRole(value) ? value : undefined;
}

function parseStringQuery(value: unknown) {
  const normalized = normalizeOptionalTrimmedString(value);
  return normalized ? normalized : undefined;
}

function parseOptionalUuidQuery(value: unknown, errorMessage: string) {
  const normalized = normalizeOptionalTrimmedString(value);

  if (!normalized) {
    return undefined;
  }

  if (!isUuid(normalized)) {
    throw new HttpError(400, errorMessage);
  }

  return normalized;
}

function normalizeAdminUserPatch(payload: Record<string, unknown>) {
  const fullName = normalizeOptionalTrimmedString(payload.full_name);
  const avatarUrl = payload.avatar_url === null ? null : normalizeOptionalTrimmedString(payload.avatar_url);

  if (fullName !== undefined && fullName.length > 120) {
    throw new HttpError(400, 'O campo full_name aceita no máximo 120 caracteres.');
  }

  if (avatarUrl !== undefined && avatarUrl !== '' && avatarUrl !== null && !isHttpUrl(avatarUrl)) {
    throw new HttpError(400, 'O campo avatar_url precisa ser uma URL http(s) válida ou null.');
  }

  return {
    ...(fullName !== undefined ? { full_name: fullName || null } : {}),
    ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {})
  };
}
