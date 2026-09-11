import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConstructorRef, Driver } from '../../models/driver';
import { driversService } from '../../services/drivers.service';
import { renderWithQuery } from '../../test/render-with-query';
import { DriversPage } from './DriversPage';

// Se mockea el servicio, no axios: el contrato que le importa a la pagina es el del servicio.
vi.mock('../../services/drivers.service');

const constructors: ConstructorRef[] = [
  { id: 3, name: 'Red Bull Racing', color: '#3671C6', logoUrl: null },
  { id: 5, name: 'Ferrari', color: '#E8002D', logoUrl: null },
];

const verstappen: Driver = {
  id: 7,
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1,
  code: 'VER',
  headshotUrl: null,
  constructor: constructors[0],
};

const leclerc: Driver = {
  id: 8,
  firstName: 'Charles',
  lastName: 'Leclerc',
  number: 16,
  code: 'LEC',
  headshotUrl: null,
  constructor: constructors[1],
};

beforeEach(() => {
  vi.mocked(driversService.constructors).mockResolvedValue(constructors);
  // El filtro es server-side: el mock responde segun el constructorId que reciba.
  vi.mocked(driversService.list).mockImplementation((constructorId?: number) =>
    Promise.resolve(constructorId === 5 ? [leclerc] : [verstappen, leclerc]),
  );
});

describe('DriversPage', () => {
  it('lista los pilotos que devuelve el servicio', async () => {
    renderWithQuery(<DriversPage />, { route: '/drivers' });

    expect(await screen.findByText('Max Verstappen')).toBeInTheDocument();
    expect(screen.getByText('Charles Leclerc')).toBeInTheDocument();
  });

  it('al elegir una escuderia, se la pide al backend y se achica la lista', async () => {
    renderWithQuery(<DriversPage />, { route: '/drivers' });
    await screen.findByText('Max Verstappen');

    await userEvent.selectOptions(screen.getByRole('combobox'), '5');

    await waitFor(() => expect(driversService.list).toHaveBeenCalledWith(5));
    await waitFor(() => expect(screen.queryByText('Max Verstappen')).not.toBeInTheDocument());
    expect(screen.getByText('Charles Leclerc')).toBeInTheDocument();
  });

  // El filtro vive en la URL, asi que entrar con ?constructorId= ya filtrado tiene que andar.
  it('respeta el constructorId que viene en la URL', async () => {
    renderWithQuery(<DriversPage />, { route: '/drivers?constructorId=5' });

    await screen.findByText('Charles Leclerc');
    expect(driversService.list).toHaveBeenCalledWith(5);
    expect(screen.queryByText('Max Verstappen')).not.toBeInTheDocument();
  });
});
