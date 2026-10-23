import { z } from 'zod';
import { RaceStatus } from '../../generated/prisma/enums';
import { seasonQuerySchema } from '../../shared/params';

// No usar z.coerce.date(): new Date(null), new Date(true) y new Date(0) no fallan y devuelven
// 1970-01-01, una fecha que nadie cargo.
const isoDate = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

export const createRaceSchema = z.object({
  name: z.string().min(1),
  round: z.number().int().min(1),
  date: isoDate,
  qualifyingDate: isoDate.optional(),
  sprintDate: isoDate.optional(),
  seasonId: z.number().int(),
  circuitId: z.number().int(),
});

export const updateRaceSchema = createRaceSchema.partial();

// Un ?status invalido se ignora en vez de dar 400. z.enum compara contra los valores propios
// del enum, asi que ?status=toString tampoco pasa.
export const listRacesQuerySchema = seasonQuerySchema.extend({
  status: z.enum(RaceStatus).optional().catch(undefined),
});

// Un DNF puede tener posicion (en F1 queda clasificado si completo el 90% de la carrera), asi
// que solo se exige la direccion contraria: CLASSIFIED necesita posicion.
const raceResultItemSchema = z.object({
  driverId: z.number().int().positive(),
  position: z.number().int().positive().optional(),
  gridPosition: z.number().int().positive().optional(),
  laps: z.number().int().nonnegative().optional(),
  fastestLap: z.boolean().optional(),
  status: z.enum(['CLASSIFIED', 'DNF', 'DSQ', 'DNS']),
});

export const loadRaceResultsSchema = z.object({
  // max(30): margen sobre los ~20 pilotos actuales para parrillas historicas mas grandes.
  results: z
    .array(raceResultItemSchema)
    .min(1)
    .max(30)
    // Los puntos salen de la posicion: una repetida reparte puntos de mas, y un CLASSIFIED sin
    // posicion entraria con 0 en silencio. No se exigen posiciones seguidas: Jolpica trae
    // suplentes que no estan en la grilla y al saltearlos queda un hueco real.
    .superRefine((results, ctx) => {
      const seen = new Set<number>();
      results.forEach((r, i) => {
        if (r.status === 'CLASSIFIED' && r.position === undefined) {
          ctx.addIssue({
            code: 'custom',
            path: [i, 'position'],
            message: 'Classified driver needs a position',
          });
        }
        if (r.position !== undefined) {
          if (seen.has(r.position)) {
            ctx.addIssue({
              code: 'custom',
              path: [i, 'position'],
              message: `Position ${r.position} is repeated`,
            });
          }
          seen.add(r.position);
        }
      });
      if (results.filter((r) => r.fastestLap).length > 1) {
        ctx.addIssue({
          code: 'custom',
          path: [],
          message: 'Only one driver can have the fastest lap',
        });
      }
    }),
});

export type CreateRaceInput = z.infer<typeof createRaceSchema>;
export type UpdateRaceInput = z.infer<typeof updateRaceSchema>;
export type LoadRaceResultsInput = z.infer<typeof loadRaceResultsSchema>;
export type ListRacesQuery = z.infer<typeof listRacesQuerySchema>;
