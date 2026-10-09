import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConstructorRef, Driver } from '../../models/driver';
import type { LeagueListItem } from '../../models/league';
import { LeagueCard } from './LeagueCard';

const league: LeagueListItem = {
  id: 7,
  name: 'Liga UTN',
  inviteCode: 'utn-2026',
  maxMembers: 11,
  seasonId: 1,
  createdById: 1,
  draftStatus: 'PENDING',
  status: 'ACTIVE',
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
  myTeam: null,
};

const alpine: ConstructorRef = { id: 3, name: 'Alpine', color: '#0093cc', logoUrl: null };
const drivers: Driver[] = [
  {
    id: 10,
    firstName: 'Pierre',
    lastName: 'Gasly',
    number: 10,
    code: 'GAS',
    headshotUrl: null,
    constructor: alpine,
  },
  {
    id: 43,
    firstName: 'Franco',
    lastName: 'Colapinto',
    number: 43,
    code: 'COL',
    headshotUrl: null,
    constructor: alpine,
  },
];

function montar(l: LeagueListItem, onOpen: (id: number) => void = () => {}) {
  return render(
    <LeagueCard league={l} drivers={drivers} constructors={[alpine]} onOpen={onOpen} />,
  );
}

describe('LeagueCard', () => {
  it('muestra nombre, codigo y estado del draft', () => {
    montar(league);
    expect(screen.getByText('Liga UTN')).toBeInTheDocument();
    expect(screen.getByText('utn-2026')).toBeInTheDocument();
    expect(screen.getByText('Draft pendiente')).toBeInTheDocument();
  });

  it('llama onOpen con el id al hacer click', async () => {
    const onOpen = vi.fn();
    montar(league, onOpen);
    await userEvent.click(screen.getByRole('button', { name: /ver liga/i }));
    expect(onOpen).toHaveBeenCalledWith(7);
  });

  // El nombre accesible tiene que distinguir esta tarjeta de las otras: con varias ligas en
  // pantalla, "Ver liga" repetido no le dice nada a un lector de pantalla.
  it('el boton nombra la liga en su aria-label', () => {
    montar(league);
    expect(screen.getByRole('button', { name: 'Ver liga Liga UTN' })).toBeInTheDocument();
  });

  it('con el draft hecho muestra el equipo elegido', () => {
    montar({
      ...league,
      draftStatus: 'COMPLETED',
      myTeam: { id: 1, leagueMemberId: 1, driver1Id: 10, driver2Id: 43, constructorId: 3 },
    });
    expect(screen.getByText('Tu equipo')).toBeInTheDocument();
    expect(screen.getByText('GAS')).toBeInTheDocument();
    expect(screen.getByText('COL')).toBeInTheDocument();
    expect(screen.getByText('Alpine')).toBeInTheDocument();
  });

  // Antes del draft el FantasyTeam existe con los slots vacios. Una fila de guiones no
  // comunica nada, asi que la seccion no se dibuja.
  it('con los slots vacios no dibuja la seccion del equipo', () => {
    montar({
      ...league,
      myTeam: { id: 1, leagueMemberId: 1, driver1Id: null, driver2Id: null, constructorId: null },
    });
    expect(screen.queryByText('Tu equipo')).not.toBeInTheDocument();
  });
});
