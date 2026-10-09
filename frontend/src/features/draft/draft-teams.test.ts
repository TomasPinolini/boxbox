import { buildDraftTeams } from './draft-teams';
import type { DraftPick } from '../../models/draft';

// El orden serpiente de 2 jugadores en 3 rondas: 1-2, 2-1, 1-2. Lo escribo con los
// pickNumber reales en vez de generarlos, para que el test no repita la formula que
// genera el orden en el backend.
const pick = (
  pickNumber: number,
  round: number,
  leagueMemberId: number,
  driverId: number | null,
  constructorId: number | null = null,
): DraftPick => ({
  id: pickNumber,
  leagueMemberId,
  pickNumber,
  round,
  driverId,
  constructorId,
  pickedAt: '2026-10-09T18:00:00.000Z',
});

const PICKS: DraftPick[] = [
  pick(1, 1, 10, 4), // yo: Norris
  pick(2, 1, 20, 1), // Rivero: Verstappen
  pick(3, 2, 20, 44), // Rivero: Hamilton
  pick(4, 2, 10, 16), // yo: Leclerc
  pick(5, 3, 10, null, 7), // yo: Alpine
  pick(6, 3, 20, null, 3), // Rivero: Ferrari
];

describe('buildDraftTeams', () => {
  it('separa mi equipo del de los demas', () => {
    const { mine, others } = buildDraftTeams(PICKS, 10);

    expect(mine).toEqual({ leagueMemberId: 10, driverIds: [4, 16], constructorId: 7 });
    expect(others).toEqual([{ leagueMemberId: 20, driverIds: [1, 44], constructorId: 3 }]);
  });

  // Pasa de verdad: el draft arranca con un solo miembro si el dueno aprieta "Iniciar draft"
  // sin esperar a nadie, y no hay vuelta atras. La pantalla no puede mostrar una seccion
  // "los demas" vacia en ese caso.
  it('deja others vacio en una liga de un solo jugador', () => {
    const solo = PICKS.filter((p) => p.leagueMemberId === 10);
    const { mine, others } = buildDraftTeams(solo, 10);

    expect(mine).toEqual({ leagueMemberId: 10, driverIds: [4, 16], constructorId: 7 });
    expect(others).toEqual([]);
  });

  // useMembers resuelve despues que el socket, asi que hay un render donde todavia no se sabe
  // cual de los leagueMemberId soy yo. Lo importante es que nadie se pierda: sin mi id, los
  // tres equipos siguen estando, todos como "otros".
  it('cuando todavia no se sabe quien soy, no pierde ningun equipo', () => {
    const { mine, others } = buildDraftTeams(PICKS, null);

    expect(mine).toBeNull();
    expect(others.map((e) => e.leagueMemberId)).toEqual([10, 20]);
  });
});
