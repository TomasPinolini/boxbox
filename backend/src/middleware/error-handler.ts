import { Request, Response, NextFunction } from 'express';
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

  // Body JSON malformado: express.json() (body-parser) tira un SyntaxError con
  // `type: 'entity.parse.failed'`. No es un AppError nuestro, pero tampoco es un bug del
  // server — es un 400 del cliente. Sin esta rama caia al 500 generico (A3 / BOX-13).
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

  // Unexpected errors — log them but don't expose details to the client
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      status: 500,
    },
  });
}
