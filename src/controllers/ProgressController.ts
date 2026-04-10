import { type Request, type Response } from 'express';
import { ProgressService } from '../services/ProgressService.js';

export class ProgressController {
  async show(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      const progressService = new ProgressService();
      const progress = await progressService.getUserProgress(String(userId));

      res.json({
        total_visitados: progress?.length || 0,
        historico: progress
      });
      
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro interno no servidor.' });
    }
  }
}