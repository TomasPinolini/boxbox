// SCHEMA — el contrato de datos del módulo
// Define con Zod la forma válida del input que llega por HTTP.
// También exporta los tipos TypeScript derivados — así el schema y los tipos nunca se dessincronizan.

import { z } from 'zod';

// Schema de creación: todos los campos requeridos con sus restricciones
export const createDriverSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  number: z.number().int().min(0).max(99),
  code: z.string().length(3).toUpperCase(), // siempre 3 letras mayúsculas: "VER", "NOR"
  headshotUrl: z.string().url().optional(), // opcional — se puede agregar después
  externalId: z.string().min(1),
});

// .partial() convierte todos los campos en opcionales → para PATCH (actualización parcial)
// Reutilizamos el mismo schema base para no repetir las restricciones de cada campo
export const updateDriverSchema = createDriverSchema.partial();

// z.infer<> deriva los tipos TypeScript directamente del schema de Zod.
// Si cambiás el schema, los tipos cambian solos — cero sincronización manual.
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
