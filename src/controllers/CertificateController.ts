import { type Request, type Response } from 'express';
import { CertificateService } from '../services/CertificateService.js';

export class CertificateController {
  async store(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'O ID do usuário é obrigatório.' });
        return;
      }

      const certificateService = new CertificateService();
      const certificate = await certificateService.issueCertificate(userId);

      res.status(201).json({
        mensagem: 'Parabéns! Certificado da Ciclorota emitido com sucesso.',
        certificado: certificate
      });

    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}