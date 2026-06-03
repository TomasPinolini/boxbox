import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// validate: valida req.body contra el schema. Si pasa, reemplaza req.body con la version
// parsed (con transforms aplicados, ej. inviteCode lowercase). Si falla, devuelve 400
// VALIDATION_ERROR con detalle por campo.
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          status: 400,
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

// validateParams: equivalente para req.params (path params como :id, :userId).
// Express deja los params como strings; el schema deberia usar z.coerce.number() o similar
// para convertir antes de validar. Si pasa, reemplaza req.params con la version coerced.
//
// Cierra deuda P3-2: sin esto, controllers hacian `Number(req.params.id)` ciegamente y
// "abc" llegaba como NaN a Prisma (query inutil). Ahora 400 VALIDATION_ERROR antes del service.
//
// Nota: req.params es tipado por Express como Record<string, string>. El cast con
// `as Request['params']` evita warnings cuando el schema produce numbers (porque el coerce
// transforma a number en el output del schema, distinto al input type de Express).
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid path params',
          status: 400,
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }

    req.params = result.data as Request['params'];
    next();
  };
}
