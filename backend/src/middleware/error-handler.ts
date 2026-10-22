import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError } from '../shared/errors';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        status: err.statusCode,
      },
    });
    return;
  }

  // JSON malformado: express.json() tira un SyntaxError que no es AppError pero es un 400.
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON',
        status: 400,
      },
    });
    return;
  }

  // Se captura aca y no con Sentry.setupExpressErrorHandler: este handler nunca llama a
  // next(err), y es el unico punto que ya separa un bug nuestro de un 4xx del cliente.
  Sentry.captureException(err);
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      status: 500,
    },
  });
}
