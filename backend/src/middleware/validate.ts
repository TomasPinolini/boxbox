import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Reemplaza req.body por la version parseada, con los transforms del schema aplicados.
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

// Los params llegan como string: el schema tiene que usar z.coerce.number().
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

// No reemplaza req.query: en Express 5 es un getter sin setter y asignarle tira TypeError en
// runtime (tsc no avisa). El resultado va a req.validatedQuery.
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query params',
          status: 400,
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}
