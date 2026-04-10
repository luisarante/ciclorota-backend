import { type Request, type Response } from 'express';
import { AuthService } from '../services/AuthService.js';

export class AuthController {
  private readonly authService = new AuthService();

  async login(request: Request, response: Response): Promise<void> {
    try {
      const { email, password } = request.body ?? {};

      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        response.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        return;
      }

      const payload = await this.authService.login(email, password);
      response.json(payload);
    } catch (error: any) {
      response.status(401).json({ error: error.message || 'Falha ao autenticar usuário.' });
    }
  }

  async refresh(request: Request, response: Response): Promise<void> {
    try {
      const { refreshToken } = request.body ?? {};

      if (typeof refreshToken !== 'string' || !refreshToken) {
        response.status(400).json({ error: 'O refresh token é obrigatório.' });
        return;
      }

      const payload = await this.authService.refresh(refreshToken);
      response.json(payload);
    } catch (error: any) {
      response.status(401).json({ error: error.message || 'Falha ao renovar a sessão.' });
    }
  }

  async me(request: Request, response: Response): Promise<void> {
    try {
      if (!request.auth?.accessToken) {
        response.status(401).json({ error: 'Sessão não encontrada.' });
        return;
      }

      const payload = await this.authService.getCurrentSession(request.auth.accessToken);
      response.json(payload);
    } catch (error: any) {
      response.status(401).json({ error: error.message || 'Falha ao carregar a sessão atual.' });
    }
  }
}
