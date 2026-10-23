// El sync nunca crea Drivers ni DriverSeasons: Jolpica lista 32 pilotos para 2026 (suplentes
// incluidos) y maxMembersForSeason depende de driverCount. Lo que no matchea queda `skipped`.
// Las reglas de carga viven en races.service.ts (loadResults); aca solo se traduce el formato.

import { prisma } from '../../shared/prisma';
import type { RaceResultStatus, SyncType } from '../../generated/prisma/enums';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors';
import { fetchRaces, fetchRaceResults, type JolpicaResult } from '../../shared/jolpica';
import { loadResults } from '../races/races.service';
import { seasonTeams } from '../drivers/drivers.service';
import { loadRaceResultsSchema, type LoadRaceResultsInput } from '../races/races.schema';

type Skipped = { ref: string; reason: string };
type Outcome = { created: number; updated: number; skipped: Skipped[]; note?: string };

// SyncLog no tiene columna de detalle: `error` es el unico campo de texto, asi que ahi van
// tanto el motivo de un FAILED como la lista de salteados de un PARTIAL.
async function withSyncLog<T extends Outcome>(
  type: SyncType,
  triggeredById: number,
  run: () => Promise<T>,
) {
  try {
    const out = await run();
    const status = out.skipped.length > 0 ? ('PARTIAL' as const) : ('SUCCESS' as const);
    const detail = [out.note, ...out.skipped.map((s) => `skipped ${s.ref}: ${s.reason}`)]
      .filter(Boolean)
      .join('; ');
    const log = await prisma.syncLog.create({
      data: {
        type,
        status,
        recordsCreated: out.created,
        recordsUpdated: out.updated,
        recordsSkipped: out.skipped.length,
        error: detail || null,
        triggeredById,
      },
    });
    return { ...out, status, syncLogId: log.id };
  } catch (err) {
    const reason = err instanceof AppError ? `${err.code}: ${err.message}` : 'INTERNAL_ERROR';
    await prisma.syncLog.create({
      data: { type, status: 'FAILED', error: reason, triggeredById },
    });
    throw err;
  }
}

const oneHourBefore = (date: Date) => new Date(date.getTime() - 60 * 60 * 1000);
const toDate = (s: { date: string; time?: string }) =>
  new Date(`${s.date}T${s.time ?? '00:00:00Z'}`);

export function syncRaces(year: number, triggeredById: number) {
  return withSyncLog('RACES', triggeredById, async () => {
    // La Season no se crea aca: activarla y cargarle la grilla es una decision del admin.
    const season = await prisma.season.findUnique({ where: { year } });
    if (!season) throw new NotFoundError('Season');

    const remote = await fetchRaces(year);
    const out: Outcome & { circuitsCreated: number } = {
      created: 0,
      updated: 0,
      skipped: [],
      circuitsCreated: 0,
    };

    for (const r of remote) {
      // Nunca se pisa un Circuit existente: el seed trae nombres curados, y un soft-deleted
      // conserva su externalId (es @unique).
      const externalId = r.Circuit.circuitId;
      let circuit = await prisma.circuit.findUnique({ where: { externalId } });
      if (!circuit) {
        circuit = await prisma.circuit.create({
          data: {
            externalId,
            name: r.Circuit.circuitName,
            city: r.Circuit.Location.locality,
            country: r.Circuit.Location.country,
          },
        });
        out.circuitsCreated++;
      }

      const date = toDate(r);
      const data = {
        name: r.raceName,
        date,
        lockDate: oneHourBefore(date),
        qualifyingDate: r.Qualifying ? toDate(r.Qualifying) : null,
        sprintDate: r.Sprint ? toDate(r.Sprint) : null,
        circuitId: circuit.id,
      };

      const where = { seasonId_round: { seasonId: season.id, round: r.round } };
      const existing = await prisma.race.findUnique({ where });
      if (!existing) {
        await prisma.race.create({ data: { ...data, round: r.round, seasonId: season.id } });
        out.created++;
        continue;
      }

      // Race no tiene externalId, su clave es (seasonId, round): si esa fecha ya tiene
      // resultados de otro circuito, pisarla los pegaria a una carrera que no es.
      if (existing.circuitId !== circuit.id) {
        const results = await prisma.raceResult.count({ where: { raceId: existing.id } });
        if (results > 0) {
          out.skipped.push({
            ref: `round ${r.round}`,
            reason: `"${existing.name}" has ${results} results from another circuit, not overwritten with "${r.raceName}"`,
          });
          continue;
        }
      }

      // `status` no se toca: lo gobierna la carga de resultados, no el calendario.
      await prisma.race.update({ where, data });
      out.updated++;
    }

    return out;
  });
}

// Por positionText y no por status: hay "Retired" con posicion numerica (clasifico por
// distancia) y "Lapped" con positionText "R". La usa tambien el script del seed, para que
// seed y sync no difieran sobre la misma carrera.
export function mapStatus(positionText: string): RaceResultStatus {
  if (/^\d+$/.test(positionText)) return 'CLASSIFIED';
  if (positionText === 'D' || positionText === 'E') return 'DSQ'; // disqualified / excluded
  if (positionText === 'W' || positionText === 'F') return 'DNS'; // withdrew / failed to qualify
  return 'DNF'; // R (retired), N (not classified). No numerico = no clasifico.
}

function mapResult(r: JolpicaResult, driverId: number): LoadRaceResultsInput['results'][number] {
  const status = mapStatus(r.positionText);
  return {
    driverId,
    // Jolpica numera tambien a los no clasificados; aca `position` es puesto final.
    ...(status === 'CLASSIFIED' ? { position: r.position } : {}),
    points: r.points,
    // grid 0 = largo desde boxes: no tiene posicion de grilla.
    ...(r.grid ? { gridPosition: r.grid } : {}),
    ...(r.laps !== undefined ? { laps: r.laps } : {}),
    fastestLap: r.FastestLap?.rank === '1',
    status,
  };
}

export function syncResults(raceId: number, triggeredById: number, dryRun: boolean) {
  return withSyncLog('RESULTS', triggeredById, async () => {
    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: { season: true, circuit: true },
    });
    if (!race) throw new NotFoundError('Race');

    const remote = await fetchRaceResults(race.season.year, race.round);
    if (!remote) {
      throw new ConflictError(
        `Jolpica has no results for ${race.season.year} round ${race.round} yet`,
        'SYNC_RESULTS_NOT_AVAILABLE',
      );
    }
    // Se empareja por round: sin este chequeo un calendario desfasado carga Miami adentro de Japon.
    if (remote.Circuit.circuitId !== race.circuit.externalId) {
      throw new ConflictError(
        `Round ${race.round} is "${race.name}" (${race.circuit.externalId}) here but "${remote.raceName}" (${remote.Circuit.circuitId}) in Jolpica — sync the races first`,
        'SYNC_RACE_MISMATCH',
      );
    }

    // Queries planas + merge en TS: nada de include/select sobre la relacion `constructor`.
    const drivers = await prisma.driver.findMany({
      where: { externalId: { in: remote.Results.map((r) => r.Driver.driverId) }, deletedAt: null },
      select: { id: true, externalId: true },
    });
    const idByExternalId = new Map(drivers.map((d) => [d.externalId, d.id]));
    const inSeason = new Set((await seasonTeams(race.seasonId)).keys());

    const skipped: Skipped[] = [];
    const mapped: LoadRaceResultsInput['results'] = [];
    for (const r of remote.Results) {
      const driverId = idByExternalId.get(r.Driver.driverId);
      if (driverId === undefined) {
        skipped.push({ ref: r.Driver.driverId, reason: 'driver not found' });
      } else if (!inSeason.has(driverId)) {
        skipped.push({ ref: r.Driver.driverId, reason: `no DriverSeason for ${race.season.year}` });
      } else {
        mapped.push(mapResult(r, driverId));
      }
    }

    // Aca no hay middleware que valide: el schema ataja p. ej. medios puntos (points es Int).
    const parsed = loadRaceResultsSchema.safeParse({ results: mapped });
    if (!parsed.success) {
      throw new AppError(
        502,
        'JOLPICA_BAD_RESPONSE',
        'Jolpica results do not fit the race result schema — load them manually',
      );
    }

    if (!dryRun) await loadResults(raceId, parsed.data);

    return {
      created: dryRun ? 0 : mapped.length,
      updated: 0,
      skipped,
      note: `${dryRun ? 'dryRun ' : ''}race ${raceId} (${race.season.year} round ${race.round})`,
      dryRun,
      race: { id: race.id, round: race.round, name: race.name },
      results: parsed.data.results,
    };
  });
}
