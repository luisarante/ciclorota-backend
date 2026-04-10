import { type Request, type Response } from 'express';
import { CertificateService } from '../services/CertificateService.js';
import { getErrorMessage, getErrorStatus, HttpError } from '../utils/httpError.js';
import { applyPaginationHeaders, parsePaginationQuery } from '../utils/pagination.js';
import { isUuid, normalizeOptionalTrimmedString } from '../utils/validation.js';

export class CertificateController {
  private readonly certificateService = new CertificateService();

  async store(request: Request, response: Response): Promise<void> {
    await this.issueCertificate(request, response, request.auth?.userId);
  }

  async storeMe(request: Request, response: Response): Promise<void> {
    await this.issueCertificate(request, response, request.auth?.userId);
  }

  async adminIndex(request: Request, response: Response): Promise<void> {
    try {
      const pagination = parsePaginationQuery(request.query.page, request.query.limit);
      const userId = parseOptionalUuidQuery(request.query.userId);
      const payload = await this.certificateService.listCertificates({
        ...pagination,
        ...(userId ? { userId } : {})
      });
      applyPaginationHeaders(response, payload);
      response.json(payload.items);
    } catch (error: any) {
      response.status(getErrorStatus(error, 500)).json({ error: getErrorMessage(error, 'Erro ao listar certificados.') });
    }
  }

  async adminIssue(request: Request, response: Response): Promise<void> {
    const userId = normalizeRouteParam(request.params.userId);
    await this.issueCertificate(request, response, userId);
  }

  private async issueCertificate(request: Request, response: Response, userId?: string): Promise<void> {
    try {
      if (!userId) {
        response.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      if (!isUuid(userId)) {
        response.status(400).json({ error: 'O ID do usuário precisa ser um UUID válido.' });
        return;
      }

      const certificate = await this.certificateService.issueCertificate(userId);

      response.status(201).json({
        mensagem: 'Certificado da Ciclorota emitido com sucesso.',
        certificado: certificate
      });
    } catch (error: any) {
      response.status(getErrorStatus(error, 400)).json({ error: getErrorMessage(error, 'Erro ao emitir certificado.') });
    }
  }
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseOptionalUuidQuery(value: unknown) {
  const normalized = normalizeOptionalTrimmedString(value);

  if (!normalized) {
    return undefined;
  }

  if (!isUuid(normalized)) {
    throw new HttpError(400, 'O filtro userId precisa ser um UUID válido.');
  }

  return normalized;
}
