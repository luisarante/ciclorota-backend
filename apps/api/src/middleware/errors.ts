import type { NextFunction, Request, Response } from 'express';
import { getErrorMessage, getErrorStatus } from '../utils/httpError.js';

export function notFoundHandler(_request: Request, response: Response) {
  response.status(404).json({ error: 'Rota não encontrada.' });
}

export function errorHandler(error: unknown, _request: Request, response: Response, next: NextFunction) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isJsonParseError(error)) {
    response.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
    return;
  }

  response.status(getErrorStatus(error, 500)).json({
    error: getErrorMessage(error, 'Erro interno no servidor.')
  });
}

function isJsonParseError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'type' in error &&
      (error as { type?: string }).type === 'entity.parse.failed'
  );
}
