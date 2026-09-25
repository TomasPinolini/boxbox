import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ConstructorRef } from '../../models/driver';
import { ApiError } from '../../services/api-error';
import { driversService } from '../../services/drivers.service';
import { renderWithQuery } from '../../test/render-with-query';
import { ChampionshipPage } from './ChampionshipPage';

// Se mockea el servicio, no axios — mismo criterio que DriversPage.test.tsx.
vi.mock('../../services/drivers.service');

const mclaren: ConstructorRef = { id: 1, name: 'McLaren', color: '#FF8000', logoUrl: null };
const ferrari: ConstructorRef = { id: 2, name: 'Ferrari', color: '#E8002D', logoUrl: null };

const norris = {
  id: 4,
  firstName: 'Lando',
  lastName: 'Norris',
  code: 'NOR',
  headshotUrl: null,
  constructor: mclaren,
};
const leclerc = {
  ...norris,
  id: 16,
  firstName: 'Charles',
  lastName: 'Leclerc',
  code: 'LEC',
  constructor: ferrari,
};

describe('ChampionshipPage', () => {
  it('muestra las dos tablas en el orden que devuelve el backend', async () => {
    vi.mocked(driversService.standings).mockResolvedValue([
      { position: 1, points: 40, wins: 1, driver: norris },
      { position: 2, points: 33, wins: 0, driver: leclerc },
    ]);
    // Orden inverso al de pilotos a proposito: si la pagina reordenara por su cuenta, o
    // cruzara las tablas, alguna de las dos aserciones falla.
    vi.mocked(driversService.constructorStandings).mockResolvedValue([
      { position: 1, points: 67, constructor: ferrari },
      { position: 2, points: 53, constructor: mclaren },
    ]);

    renderWithQuery(<ChampionshipPage />, { route: '/standings' });

    const link = await screen.findByRole('link', { name: /Lando Norris/ });
    expect(link).toHaveAttribute('href', '/drivers/4');

    const [driversTable, constructorsTable] = await screen.findAllByRole('table');
    const driverRows = within(driversTable).getAllByRole('row').slice(1); // sin la cabecera
    expect(driverRows[0]).toHaveTextContent('Lando Norris');
    expect(driverRows[0]).toHaveTextContent('40');
    expect(driverRows[1]).toHaveTextContent('Charles Leclerc');

    const constructorRows = within(constructorsTable).getAllByRole('row').slice(1);
    expect(constructorRows[0]).toHaveTextContent('Ferrari');
    expect(constructorRows[0]).toHaveTextContent('67');
    expect(constructorRows[1]).toHaveTextContent('McLaren');
  });

  it('una tabla con error no tumba a la otra', async () => {
    vi.mocked(driversService.standings).mockRejectedValue(
      new ApiError('INTERNAL_ERROR', 500, 'boom'),
    );
    vi.mocked(driversService.constructorStandings).mockResolvedValue([
      { position: 1, points: 67, constructor: ferrari },
    ]);

    renderWithQuery(<ChampionshipPage />, { route: '/standings' });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(await screen.findByText('Ferrari')).toBeInTheDocument();
  });
});
