import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConstructorRef, Driver } from '../../models/driver';
import type { League } from '../../models/league';
import type { User } from '../../models/user';
import { ApiError } from '../../services/api-error';
import { driversService } from '../../services/drivers.service';
import { leaguesService } from '../../services/leagues.service';
import { useAuthStore } from '../../store/auth.store';
import { renderWithQuery } from '../../test/render-with-query';
import { LeagueDetailPage } from './LeagueDetailPage';

// Se mockean los servicios, no axios: el contrato que le importa a la pantalla es el del
// servicio. Los tres hacen falta — si falta uno, su query queda colgada y el test falla por
// timeout en vez de por la aserción.
vi.mock('../../services/leagues.service');
vi.mock('../../services/drivers.service');
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useParams: () => ({ id: '1' }),
}));

const mclaren: ConstructorRef = { id: 10, name: 'McLaren', color: '#FF8000', logoUrl: null };
const mercedes: ConstructorRef = { id: 11, name: 'Mercedes', color: '#00D7B6', logoUrl: null };

const norris: Driver = {
  id: 1,
  firstName: 'Lando',
  lastName: 'Norris',
  number: 4,
  code: 'NOR',
  headshotUrl: null,
  constructor: mclaren,
};
const russell: Driver = { ...norris, id: 2, firstName: 'George', lastName: 'Russell', code: 'RUS' };

const yo: User = {
  id: 100,
  email: 'yo@boxbox.test',
  name: 'Tomás',
  avatarUrl: null,
  role: 'USER',
};

// Liga con el draft terminado: es la forma de la pantalla que este archivo defiende.
const ligaCompletada: League = {
  id: 1,
  name: 'Liga de los pibes',
  inviteCode: 'los-pibes',
  maxMembers: 11,
  seasonId: 1,
  draftStatus: 'COMPLETED',
  status: 'ACTIVE',
  createdById: 100,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
};

const miMembresia = {
  id: 500,
  leagueId: 1,
  userId: 100,
  isOwner: true,
  status: 'ACTIVE' as const,
  joinedAt: '2026-03-01T00:00:00.000Z',
  user: { id: 100, name: 'Tomás' },
};

// Tres picks: los dos pilotos y la escudería que el draft dejó armados.
const misPicks = [
  { id: 1, leagueMemberId: 500, pickNumber: 1, round: 1, driverId: 1, constructorId: null, pickedAt: '2026-03-01T00:00:00.000Z' },
  { id: 2, leagueMemberId: 500, pickNumber: 2, round: 2, driverId: 2, constructorId: null, pickedAt: '2026-03-01T00:01:00.000Z' },
  { id: 3, leagueMemberId: 500, pickNumber: 3, round: 3, driverId: null, constructorId: 11, pickedAt: '2026-03-01T00:02:00.000Z' },
];

beforeEach(() => {
  useAuthStore.setState({ user: yo, accessToken: 'token' });
  vi.mocked(leaguesService.get).mockResolvedValue(ligaCompletada);
  vi.mocked(leaguesService.members).mockResolvedValue([miMembresia]);
  vi.mocked(leaguesService.draftState).mockResolvedValue({
    draftStatus: 'COMPLETED',
    round: null,
    pickNumber: null,
    currentTurnLeagueMemberId: null,
    picks: misPicks,
  });
  vi.mocked(leaguesService.standings).mockResolvedValue({ raceId: null, standings: [] });
  vi.mocked(driversService.list).mockResolvedValue([norris, russell]);
  vi.mocked(driversService.constructors).mockResolvedValue([mclaren, mercedes]);
});

describe('LeagueDetailPage, con el draft terminado', () => {
  it('lidera con el equipo propio y esconde lo que ya no se puede hacer', async () => {
    renderWithQuery(<LeagueDetailPage />, { route: '/leagues/1' });

    // (a) El equipo armado es lo primero, no una tabla de posiciones vacía.
    expect(await screen.findByRole('heading', { name: /Tu equipo/i })).toBeInTheDocument();
    // El nombre va completo en un solo nodo: "Lando Norris".
    expect(screen.getByText(/Norris/)).toBeInTheDocument();
    expect(screen.getByText(/Russell/)).toBeInTheDocument();

    // (b) Invitar e iniciar el draft ya no tienen sentido: el draft terminó.
    expect(screen.queryByText(/Invitá a tus amigos/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar draft/i })).not.toBeInTheDocument();

    // (c) Y el título no puede seguir hablando de un draft en vivo.
    expect(screen.queryByText(/Draft en vivo/i)).not.toBeInTheDocument();
  });

  it('avisa cuando no se pudieron traer los equipos, en vez de liderar con nada', async () => {
    vi.mocked(leaguesService.draftState).mockRejectedValue(
      new ApiError('INTERNAL_ERROR', 500, 'boom'),
    );

    renderWithQuery(<LeagueDetailPage />, { route: '/leagues/1' });

    // Sin esto la pantalla queda sin equipo y sin explicación: el usuario ve una liga vacía
    // y no tiene forma de saber que algo falló.
    expect(await screen.findByRole('alert')).toHaveTextContent(/Algo salió mal/i);
  });
});
