import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Circuit } from '../../models/circuit';
import { ApiError } from '../../services/api-error';
import { circuitsService } from '../../services/circuits.service';
import { renderWithQuery } from '../../test/render-with-query';
import { CircuitsPage } from './CircuitsPage';

// Se mockea el servicio, no axios: el contrato que le importa a la pantalla es el del servicio.
vi.mock('../../services/circuits.service');

const monza: Circuit = {
  id: 1,
  name: 'Autodromo Nazionale Monza',
  country: 'Italia',
  city: 'Monza',
  circuitLength: 5.793,
  externalId: 'monza',
};

const interlagos: Circuit = {
  id: 2,
  name: 'Interlagos',
  country: 'Brasil',
  city: 'San Pablo',
  circuitLength: null,
  externalId: 'interlagos',
};

beforeEach(() => {
  vi.mocked(circuitsService.list).mockResolvedValue([monza, interlagos]);
});

describe('CircuitsPage', () => {
  it('lista los circuitos con su país, ciudad y longitud', async () => {
    renderWithQuery(<CircuitsPage />);

    expect(await screen.findByText('Autodromo Nazionale Monza')).toBeInTheDocument();
    expect(screen.getByText('Italia')).toBeInTheDocument();
    expect(screen.getByText('5.793')).toBeInTheDocument();
    // Interlagos no tiene longitud cargada: un guion, no un cero.
    const row = screen.getByText('Interlagos').closest('tr') as HTMLElement;
    expect(within(row).getByText('—')).toBeInTheDocument();
  });

  it('crea un circuito y lo muestra en el listado', async () => {
    const user = userEvent.setup();
    const nuevo: Circuit = {
      id: 3,
      name: 'Spa-Francorchamps',
      country: 'Bélgica',
      city: 'Stavelot',
      circuitLength: 7.004,
      externalId: 'spa',
    };
    vi.mocked(circuitsService.list)
      .mockResolvedValueOnce([monza])
      .mockResolvedValue([monza, nuevo]);
    vi.mocked(circuitsService.create).mockResolvedValue(nuevo);

    renderWithQuery(<CircuitsPage />);
    await screen.findByText('Autodromo Nazionale Monza');

    await user.type(screen.getByLabelText('Nombre'), 'Spa-Francorchamps');
    await user.type(screen.getByLabelText('País'), 'Bélgica');
    await user.type(screen.getByLabelText('Ciudad'), 'Stavelot');
    await user.type(screen.getByLabelText('Longitud (km)'), '7.004');
    await user.type(screen.getByLabelText('ID externo'), 'spa');
    await user.click(screen.getByRole('button', { name: 'Crear circuito' }));

    await waitFor(() =>
      expect(circuitsService.create).toHaveBeenCalledWith({
        name: 'Spa-Francorchamps',
        country: 'Bélgica',
        city: 'Stavelot',
        circuitLength: 7.004,
        externalId: 'spa',
      }),
    );
    expect(await screen.findByText('Spa-Francorchamps')).toBeInTheDocument();
  });

  it('deja crear sin longitud, que es opcional en el backend', async () => {
    const user = userEvent.setup();
    vi.mocked(circuitsService.create).mockResolvedValue(interlagos);

    renderWithQuery(<CircuitsPage />);
    await screen.findByText('Interlagos');

    await user.type(screen.getByLabelText('Nombre'), 'Interlagos');
    await user.type(screen.getByLabelText('País'), 'Brasil');
    await user.type(screen.getByLabelText('Ciudad'), 'San Pablo');
    await user.type(screen.getByLabelText('ID externo'), 'interlagos');
    await user.click(screen.getByRole('button', { name: 'Crear circuito' }));

    // Sin longitud el campo no viaja: el backend lo tiene optional, no nullable.
    await waitFor(() =>
      expect(circuitsService.create).toHaveBeenCalledWith({
        name: 'Interlagos',
        country: 'Brasil',
        city: 'San Pablo',
        externalId: 'interlagos',
      }),
    );
  });

  it('edita un circuito existente y el cambio persiste', async () => {
    const user = userEvent.setup();
    const editado: Circuit = { ...interlagos, city: 'São Paulo' };
    vi.mocked(circuitsService.list)
      .mockResolvedValueOnce([monza, interlagos])
      .mockResolvedValue([monza, editado]);
    vi.mocked(circuitsService.update).mockResolvedValue(editado);

    renderWithQuery(<CircuitsPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar Interlagos' }));

    expect(screen.getByLabelText('Nombre')).toHaveValue('Interlagos');
    const ciudad = screen.getByLabelText('Ciudad');
    await user.clear(ciudad);
    await user.type(ciudad, 'São Paulo');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(circuitsService.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ city: 'São Paulo' }),
      ),
    );
    expect(await screen.findByText('São Paulo')).toBeInTheDocument();
  });

  it('da de baja un circuito recién después de confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(circuitsService.list)
      .mockResolvedValueOnce([monza, interlagos])
      .mockResolvedValue([monza]);
    vi.mocked(circuitsService.remove).mockResolvedValue(interlagos);

    renderWithQuery(<CircuitsPage />);
    const row = (await screen.findByText('Interlagos')).closest('tr') as HTMLElement;

    await user.click(within(row).getByRole('button', { name: 'Dar de baja' }));
    expect(within(row).getByRole('alert')).toHaveTextContent('Interlagos');
    expect(circuitsService.remove).not.toHaveBeenCalled();

    await user.click(within(row).getByRole('button', { name: 'Confirmar baja' }));
    await waitFor(() => expect(circuitsService.remove).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText('Interlagos')).not.toBeInTheDocument());
  });

  it('muestra en castellano el error del backend cuando la baja se rechaza', async () => {
    const user = userEvent.setup();
    vi.mocked(circuitsService.remove).mockRejectedValue(
      new ApiError('CIRCUIT_HAS_DEPENDENCIES', 409, 'Cannot delete circuit with active races'),
    );

    renderWithQuery(<CircuitsPage />);
    const row = (await screen.findByText('Interlagos')).closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Dar de baja' }));
    await user.click(within(row).getByRole('button', { name: 'Confirmar baja' }));

    expect(
      await screen.findByText('No se puede dar de baja: el circuito tiene carreras programadas'),
    ).toBeInTheDocument();
  });

  it('muestra el ID externo, que es lo que el backend usa para rechazar duplicados', async () => {
    renderWithQuery(<CircuitsPage />);
    const row = (await screen.findByText('Interlagos')).closest('tr') as HTMLElement;

    // Sin esta columna, "ya hay un circuito con ese ID externo" no se puede diagnosticar.
    expect(within(row).getByText('interlagos')).toBeInTheDocument();
  });

  it('explica de dónde sale el ID externo y qué pasa si no coincide', async () => {
    renderWithQuery(<CircuitsPage />);

    const ayuda = await screen.findByText(/Jolpica identifica el circuito/i);
    expect(ayuda).toBeInTheDocument();
    // La ayuda tiene que estar asociada al campo, no suelta al lado.
    expect(screen.getByLabelText('ID externo')).toHaveAttribute(
      'aria-describedby',
      ayuda.getAttribute('id'),
    );
  });
});
