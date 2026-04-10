import { type Request, type Response } from 'express';
import { CheckinService } from '../services/CheckinService.js';

export class CheckinController {
  async store(req: Request, res: Response): Promise<void> {
    try {
      const checkins = req.body;

      if (!Array.isArray(checkins) || checkins.length === 0) {
        res.status(400).json({ error: 'Nenhum dado de check-in foi enviado ou o formato é inválido.' });
        return;
      }

      const checkinService = new CheckinService();
      const data = await checkinService.createCheckins(checkins);

      res.status(201).json({ 
        mensagem: 'Check-ins sincronizados com sucesso na Mata Atlântica!', 
        dados: data 
      });
      
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Um ou mais pontos já foram visitados por este utilizador!' });
        return;
      }
      
      res.status(500).json({ error: error.message || 'Erro interno no servidor.' });
    }
  }
}