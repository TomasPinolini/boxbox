import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type Source = 'body' | 'params' | 'query';

const MESSAGES: Record<Source, string> = {
  body: 'Invalid request body',
  params: 'Invalid path params',
  query: 'Invalid query params',
};

function validateSource(source: Source, schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: MESSAGES[source],
          status: 400,
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }

    // req.query no se reemplaza: en Express 5 es un getter sin setter y asignarle tira
    // TypeError en runtime (tsc no avisa). El resultado va a req.validatedQuery.
    if (source === 'query') req.validatedQuery = result.data;
    else if (source === 'params') req.params = result.data as Request['params'];
    else req.body = result.data;
    next();
  };
}

// Reemplaza req.body por la version parseada, con los transforms del schema aplicados.
export const validate = (schema: ZodSchema) => validateSource('body', schema);

// Los params llegan como string: el schema tiene que usar z.coerce.number().
export const validateParams = (schema: ZodSchema) => validateSource('params', schema);

export const validateQuery = (schema: ZodSchema) => validateSource('query', schema);
