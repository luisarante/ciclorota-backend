import { type Request, type Response } from 'express';
import { CheckpointService } from '../services/CheckpointService.js';

export class CheckpointController {
  async index(req: Request, res: Response): Promise<void> {
    try {
      const checkpointService = new CheckpointService();
      const checkpoints = await checkpointService.getAllCheckpoints();
      res.json(checkpoints);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}