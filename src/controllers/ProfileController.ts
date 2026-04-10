import { type Request, type Response } from 'express';
import { ProfileService } from '../services/ProfileService.js';

export class ProfileController {
  async show(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      const profileService = new ProfileService();
      const profileData = await profileService.getUserProfile(String(userId));
      res.json(profileData);
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Erro ao buscar o perfil.' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { full_name, avatar_url } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      const profileService = new ProfileService();
      const updatedProfile = await profileService.updateProfile(String(userId), { 
        full_name, 
        avatar_url 
      });

      res.json(updatedProfile);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Erro ao atualizar o perfil.' });
    }
  }
}