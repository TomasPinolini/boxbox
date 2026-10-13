// Trae los resultados REALES de una temporada desde Jolpica y los deja congelados en un
// archivo que el seed carga. Se corre a mano, cuando hace falta refrescar los datos:
//
//   npx ts-node src/scripts/fetch-jolpica-results.ts 2026
//
// Por que un archivo y no sincronizar contra la base: la suite del backend trunca todo y el
// posttest repone el seed, asi que cualquier resultado cargado a mano desaparece en la
// siguiente corrida de `npm test`. Lo unico que sobrevive es lo que el seed sabe crear.
//
// Por que no lo hace el seed directo: un seed que pega a la red no es reproducible ni corre
// sin internet, y corre en el posttest de CADA `npm test`. Mismo criterio que
// modules/sync/sync.fixtures.ts, que guarda respuestas reales grabadas para los tests.
//
// La fuente de verdad sigue siendo Jolpica. Este archivo es una foto fechada de Jolpica.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchRaceResults, fetchRaces } from '../shared/jolpica';
import { mapStatus } from '../modules/sync/sync.service';

interface StoredResult {
  // El driverId de Jolpica. Es el mismo valor que Driver.externalId en nuestra base — el seed
  // ya usa la convencion de Jolpica, incluido `max_verstappen`.
  driverExternalId: string;
  position: number | null;
  points: number;
  status: string;
  gridPosition: number | null;
  laps: number | null;
  fastestLap: boolean;
}

interface StoredRace {
  round: number;
  raceName: string;
  results: StoredResult[];
}

async function main() {
  const year = Number(process.argv[2] ?? 2026);
  if (!Number.isInteger(year)) {
    console.error('Uso: npx ts-node src/scripts/fetch-jolpica-results.ts <año>');
    process.exit(1);
  }

  console.log(`Pidiendo el calendario ${year} a Jolpica…`);
  const races = await fetchRaces(year);
  console.log(`  ${races.length} fechas en el calendario.`);

  const stored: StoredRace[] = [];
  for (const race of races) {
    const remote = await fetchRaceResults(year, race.round);
    if (!remote) {
      console.log(`  ronda ${race.round} (${race.raceName}): todavia sin resultados`);
      continue;
    }

    stored.push({
      round: race.round,
      raceName: remote.raceName,
      results: remote.Results.map((r) => {
        const status = mapStatus(r.positionText);
        return {
          driverExternalId: r.Driver.driverId,
          // Jolpica numera tambien a los que no clasificaron: para nosotros `position`
          // significa "puesto final", asi que solo la llevan los CLASSIFIED. Mismo criterio
          // que mapResult del sync.
          position: status === 'CLASSIFIED' ? r.position : null,
          points: r.points,
          status,
          // grid 0 = largo desde boxes, no es una posicion de grilla.
          gridPosition: r.grid ? r.grid : null,
          laps: r.laps ?? null,
          fastestLap: r.FastestLap?.rank === '1',
        };
      }),
    });
    console.log(`  ronda ${race.round} (${remote.raceName}): ${remote.Results.length} resultados`);
  }

  const destino = join(__dirname, '..', '..', 'prisma', 'seed-data', `results-${year}.json`);
  writeFileSync(
    destino,
    `${JSON.stringify(
      {
        year,
        source: 'https://api.jolpi.ca/ergast/f1',
        fetchedAt: new Date().toISOString(),
        races: stored,
      },
      null,
      2,
    )}\n`,
  );

  const total = stored.reduce((n, r) => n + r.results.length, 0);
  console.log(`\nListo: ${stored.length} fechas, ${total} resultados -> ${destino}`);
  console.log('Commiteá ese archivo: el seed lo lee para poblar la base.');
}

main().catch((err) => {
  console.error('Fallo:', err instanceof Error ? err.message : err);
  process.exit(1);
});
