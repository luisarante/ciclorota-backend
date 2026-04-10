import { type Request, type Response } from 'express';
import { canAccessUser } from '../middleware/auth.js';
import { ProgressService } from '../services/ProgressService.js';
import { isUuid } from '../utils/validation.js';

export class ProgressController {
  private readonly progressService = new ProgressService();

  async show(request: Request, response: Response): Promise<void> {
    const userId = normalizeRouteParam(request.params.userId);
    await this.respondWithProgress(request, response, userId);
  }

  async showMe(request: Request, response: Response): Promise<void> {
    await this.respondWithProgress(request, response, request.auth?.userId);
  }

  private async respondWithProgress(request: Request, response: Response, userId?: string): Promise<void> {
    try {
      if (!userId) {
        response.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      if (!isUuid(userId)) {
        response.status(400).json({ error: 'O ID do usuário precisa ser um UUID válido.' });
        return;
      }

      if (!canAccessUser(request, userId)) {
        response.status(403).json({ error: 'Você não pode visualizar o progresso de outro usuário.' });
        return;
      }

      const progress = await this.progressService.getUserProgress(userId);

      response.json({
        total_visitados: progress?.length || 0,
        historico: progress
      });
    } catch (error: any) {
      response.status(500).json({ error: error.message || 'Erro interno no servidor.' });
    }
  }
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
