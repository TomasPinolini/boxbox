// JOLPICA CLIENT — unico punto de contacto con la API externa de F1 (Slice 12).
// `fetch` nativo de Node + AbortSignal.timeout: sin dependencias nuevas. No pide credenciales.
//
// Todo lo que entra se valida con Zod: es un trust boundary igual que req.body. Si Jolpica
// cambia el shape preferimos un 502 tipado aca antes que un NaN en la base.
//
// Los tests NO pegan a la red: stubean `fetch` global con fixtures recortados de respuestas
// reales (ver modules/sync/sync.test.ts).

import { z } from 'zod';
import { AppError } from './errors';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const TIMEOUT_MS = 10_000;

const circuitSchema = z.object({
  circuitId: z.string().min(1),
  circuitName: z.string(),
  Location: z.object({ locality: z.string(), country: z.string() }),
});

const sessionSchema = z.object({ date: z.string(), time: z.string().optional() });

const raceSchema = z.object({
  round: z.coerce.number().int().positive(),
  raceName: z.string().min(1),
  date: z.string(),
  time: z.string().optional(),
  Circuit: circuitSchema,
  Qualifying: sessionSchema.optional(),
  Sprint: sessionSchema.optional(),
});

const resultSchema = z.object({
  position: z.coerce.number().int().positive(),
  // Fuente de verdad de la clasificacion: numero = clasifico; R retiro, N no clasificado,
  // D descalificado, E excluido, W se retiro antes de largar, F no clasifico a la carrera.
  positionText: z.string().min(1),
  points: z.coerce.number(),
  grid: z.coerce.number().int().nonnegative().optional(),
  laps: z.coerce.number().int().nonnegative().optional(),
  status: z.string(),
  Driver: z.object({ driverId: z.string().min(1) }),
  FastestLap: z.object({ rank: z.string() }).optional(),
});

const racesResponseSchema = z.object({
  MRData: z.object({ RaceTable: z.object({ Races: z.array(raceSchema) }) }),
});

const resultsResponseSchema = z.object({
  MRData: z.object({
    RaceTable: z.object({
      Races: z.array(raceSchema.extend({ Results: z.array(resultSchema) })),
    }),
  }),
});

export type JolpicaResult = z.infer<typeof resultSchema>;

type JolpicaRace = z.infer<typeof raceSchema>;

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch (err) {
    // Timeout, DNS, 429, 5xx, JSON roto: para nuestro cliente es lo mismo, la fuente no responde.
    const reason = err instanceof Error ? err.message : 'unknown error';
    throw new AppError(502, 'JOLPICA_UNAVAILABLE', `Jolpica request failed: ${reason}`);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(502, 'JOLPICA_BAD_RESPONSE', 'Jolpica returned an unexpected shape');
  }
  return parsed.data;
}

// limit=100: el default de Jolpica es 30 y trunca en silencio. 23 carreras / 22 resultados
// entran hoy, pero el margen es demasiado chico para confiarse.
export async function fetchRaces(year: number): Promise<JolpicaRace[]> {
  const data = await getJson(`/${year}/races.json?limit=100`, racesResponseSchema);
  return data.MRData.RaceTable.Races;
}

// null = Jolpica todavia no tiene resultados de esa fecha (carrera sin correr).
export async function fetchRaceResults(year: number, round: number) {
  const data = await getJson(`/${year}/${round}/results.json?limit=100`, resultsResponseSchema);
  return data.MRData.RaceTable.Races[0] ?? null;
}
