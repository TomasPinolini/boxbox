import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Driver } from '../../models/driver';
import type { Race } from '../../models/race';
import { driversService } from '../../services/drivers.service';
import { leaguesService } from '../../services/leagues.service';
import { racesService } from '../../services/races.service';
import { renderWithQuery } from '../../test/render-with-query';
import { RaceResultsPage } from './RaceResultsPage';

vi.mock('../../services/races.service');
vi.mock('../../services/drivers.service');
vi.mock('../../services/leagues.service');

const upcoming: Race = {
  id: 1,
  name: 'Australian Grand Prix',
  round: 1,
  date: '2026-03-21',
  status: 'UPCOMING',
  seasonId: 1,
};

const completed: Race = {
  id: 2,
  name: 'Saudi Arabian Grand Prix',
  round: 2,
  date: '2026-03-28',
  status: 'COMPLETED',
  seasonId: 1,
};

const verstappen: Driver = {
  id: 7,
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1,
  code: 'VER',
  headshotUrl: null,
  constructor: { id: 3, name: 'Red Bull Racing', color: '#3671C6', logoUrl: null },
};

const norris: Driver = {
  id: 6,
  firstName: 'Lando',
  lastName: 'Norris',
  number: 4,
  code: 'NOR',
  headshotUrl: null,
  constructor: { id: 1, name: 'McLaren', color: '#FF8700', logoUrl: null },
};

beforeEach(() => {
  vi.mocked(leaguesService.activeSeasonId).mockResolvedValue(1);
  vi.mocked(racesService.bySeason).mockResolvedValue([upcoming, completed]);
  vi.mocked(driversService.constructors).mockResolvedValue([
    { id: 3, name: 'Red Bull Racing', color: '#3671C6', logoUrl: null },
    { id: 1, name: 'McLaren', color: '#FF8700', logoUrl: null },
  ]);
  vi.mocked(driversService.list).mockResolvedValue([verstappen, norris]);
  vi.mocked(racesService.recalculate).mockResolvedValue({
    raceId: 2,
    leagues: 1,
    standings: 3,
  });
});

describe('RaceResultsPage', () => {
  it('lists races grouped by status: loadable and completed', async () => {
    renderWithQuery(<RaceResultsPage />, { route: '/admin/results' });

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const optgroups = select.querySelectorAll('optgroup');
      expect(optgroups.length).toBe(2);
      expect(optgroups[0].label).toBe('Cargar resultados');
      expect(optgroups[1].label).toBe('Recalcular standings');

      // UPCOMING race in first optgroup
      const upcoming = optgroups[0].querySelector('option[value="1"]');
      expect(upcoming).toBeInTheDocument();

      // COMPLETED race in second optgroup
      const completed = optgroups[1].querySelector('option[value="2"]');
      expect(completed).toBeInTheDocument();
    });
  });

  it('shows the results grid when an UPCOMING race is selected', async () => {
    renderWithQuery(<RaceResultsPage />, { route: '/admin/results' });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Australian Grand Prix');
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '1');

    await waitFor(() => {
      expect(screen.getByText('Max Verstappen')).toBeInTheDocument();
      expect(screen.getByText('Cargar y recalcular standings')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Recalcular/ })).not.toBeInTheDocument();
  });

  it('shows the recalculate button when a COMPLETED race is selected', async () => {
    renderWithQuery(<RaceResultsPage />, { route: '/admin/results' });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Australian Grand Prix');
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '2');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Recalcular/ })).toBeInTheDocument();
    });

    expect(screen.queryByText('Max Verstappen')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar y recalcular standings' })).not.toBeInTheDocument();
  });

  it('calls recalculate when the Recalcular button is clicked', async () => {
    renderWithQuery(<RaceResultsPage />, { route: '/admin/results' });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Australian Grand Prix');
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '2');

    const btn = await screen.findByRole('button', { name: /Recalcular/ });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(vi.mocked(racesService.recalculate)).toHaveBeenCalledWith(2);
    });
  });

  it('shows success message after recalculate succeeds', async () => {
    renderWithQuery(<RaceResultsPage />, { route: '/admin/results' });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Australian Grand Prix');
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '2');

    const btn = await screen.findByRole('button', { name: /Recalcular/ });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(
        screen.getByText(/Standings recalculados: 3 en 1 ligas/),
      ).toBeInTheDocument();
    });
  });

  it('resets state when switching races', async () => {
    renderWithQuery(<RaceResultsPage />, { route: '/admin/results' });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Australian Grand Prix');
    });

    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, '2');

    const btn = await screen.findByRole('button', { name: /Recalcular/ });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Standings recalculados/)).toBeInTheDocument();
    });

    await userEvent.selectOptions(select, '1');

    await waitFor(() => {
      expect(screen.queryByText(/Standings recalculados/)).not.toBeInTheDocument();
    });
  });
});
