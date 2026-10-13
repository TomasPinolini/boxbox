import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Season } from '../../models/season';
import { ApiError } from '../../services/api-error';
import { seasonsService } from '../../services/seasons.service';
import { renderWithQuery } from '../../test/render-with-query';
import { SeasonsPage } from './SeasonsPage';

// Se mockea el servicio, no axios: el contrato que le importa a la pantalla es el del servicio.
vi.mock('../../services/seasons.service');

const vacia = { races: 0, leagues: 0, drivers: 0 };
const season2026: Season = { id: 1, year: 2026, isActive: true, driverCount: 22, counts: vacia };
const season2025: Season = { id: 2, year: 2025, isActive: false, driverCount: 20, counts: vacia };

beforeEach(() => {
  vi.mocked(seasonsService.list).mockResolvedValue([season2026, season2025]);
});

describe('SeasonsPage', () => {
  it('lista las temporadas con su año, cantidad de pilotos y cuál está activa', async () => {
    renderWithQuery(<SeasonsPage />);

    expect(await screen.findByText('2026')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    // La activa se distingue sin depender del color: hay un texto que lo dice.
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('crea una temporada y la muestra en el listado', async () => {
    const user = userEvent.setup();
    const nueva: Season = { id: 3, year: 2027, isActive: false, driverCount: 20, counts: vacia };
    // La segunda respuesta del listado ya trae la nueva: es lo que pasa de verdad cuando la
    // mutacion invalida la query. Si la pantalla no invalida, este test se queda en la primera.
    vi.mocked(seasonsService.list)
      .mockResolvedValueOnce([season2026])
      .mockResolvedValue([season2026, nueva]);
    vi.mocked(seasonsService.create).mockResolvedValue(nueva);

    renderWithQuery(<SeasonsPage />);
    await screen.findByText('2026');

    await user.type(screen.getByLabelText('Año'), '2027');
    await user.type(screen.getByLabelText('Cantidad de pilotos'), '20');
    await user.click(screen.getByRole('button', { name: 'Crear temporada' }));

    await waitFor(() =>
      expect(seasonsService.create).toHaveBeenCalledWith({ year: 2027, driverCount: 20 }),
    );
    expect(await screen.findByText('2027')).toBeInTheDocument();
  });

  it('edita una temporada existente y el cambio persiste', async () => {
    const user = userEvent.setup();
    const editada: Season = { ...season2025, driverCount: 24 };
    vi.mocked(seasonsService.list)
      .mockResolvedValueOnce([season2026, season2025])
      .mockResolvedValue([season2026, editada]);
    vi.mocked(seasonsService.update).mockResolvedValue(editada);

    renderWithQuery(<SeasonsPage />);
    await user.click(await screen.findByRole('button', { name: 'Editar 2025' }));

    // El mismo formulario cambia de modo: viene cargado con los valores de la fila.
    expect(screen.getByLabelText('Año')).toHaveValue(2025);
    const driverCountInput = screen.getByLabelText('Cantidad de pilotos');
    await user.clear(driverCountInput);
    await user.type(driverCountInput, '24');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(seasonsService.update).toHaveBeenCalledWith(2, { year: 2025, driverCount: 24 }),
    );
    expect(await screen.findByText('24')).toBeInTheDocument();
  });

  it('da de baja una temporada recién después de confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(seasonsService.list)
      .mockResolvedValueOnce([season2026, season2025])
      .mockResolvedValue([season2026]);
    vi.mocked(seasonsService.remove).mockResolvedValue(undefined);

    renderWithQuery(<SeasonsPage />);
    const row = (await screen.findByText('2025')).closest('tr') as HTMLElement;

    await user.click(within(row).getByRole('button', { name: 'Dar de baja' }));
    // El primer click no borra: pide confirmar diciendo qué temporada se va.
    expect(within(row).getByRole('alert')).toHaveTextContent('2025');
    expect(seasonsService.remove).not.toHaveBeenCalled();

    await user.click(within(row).getByRole('button', { name: 'Confirmar baja' }));
    await waitFor(() => expect(seasonsService.remove).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText('2025')).not.toBeInTheDocument());
  });

  it('muestra en castellano el error del backend cuando la baja se rechaza', async () => {
    const user = userEvent.setup();
    vi.mocked(seasonsService.remove).mockRejectedValue(
      new ApiError('SEASON_HAS_DEPENDENCIES', 409, 'Cannot delete season with active leagues'),
    );

    renderWithQuery(<SeasonsPage />);
    const row = (await screen.findByText('2025')).closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Dar de baja' }));
    await user.click(within(row).getByRole('button', { name: 'Confirmar baja' }));

    // El mensaje del backend viene en inglés; la pantalla muestra el de la tabla de códigos.
    expect(
      await screen.findByText('No se puede dar de baja: la temporada tiene ligas asociadas'),
    ).toBeInTheDocument();
  });

  it('activa una temporada y no ofrece activar la que ya lo está', async () => {
    const user = userEvent.setup();
    vi.mocked(seasonsService.activate).mockResolvedValue({ ...season2025, isActive: true });

    renderWithQuery(<SeasonsPage />);
    await user.click(await screen.findByRole('button', { name: 'Activar 2025' }));

    await waitFor(() => expect(seasonsService.activate).toHaveBeenCalledWith(2));
    // La de 2026 ya está activa: ofrecerle "Activar" sería un botón que no hace nada.
    expect(screen.queryByRole('button', { name: 'Activar 2026' })).not.toBeInTheDocument();
  });

  it('muestra cuántas carreras, ligas y pilotos tiene cada temporada', async () => {
    vi.mocked(seasonsService.list).mockResolvedValue([
      { ...season2026, counts: { races: 24, leagues: 2, drivers: 21 } },
    ]);

    renderWithQuery(<SeasonsPage />);
    const row = (await screen.findByText('2026')).closest('tr') as HTMLElement;

    // Numeros distintos a proposito: el cupo es 22 y los pilotos cargados 21, asi queda claro
    // cual columna es cual.
    expect(within(row).getByText('24')).toBeInTheDocument();
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('21')).toBeInTheDocument();
  });

  it('no deja borrar una temporada con dependencias y dice por qué', async () => {
    vi.mocked(seasonsService.list).mockResolvedValue([
      { ...season2026, counts: { races: 24, leagues: 2, drivers: 21 } },
    ]);

    renderWithQuery(<SeasonsPage />);
    const row = (await screen.findByText('2026')).closest('tr') as HTMLElement;

    // El motivo se ve ANTES de apretar: el servidor lo rechazaría igual, pero tarde.
    expect(
      within(row).getByText('No se puede borrar: tiene 24 carreras, 2 ligas y 21 pilotos.'),
    ).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
  });

  it('avisa cuando el cupo de pilotos es tan bajo que ninguna liga puede formarse', async () => {
    vi.mocked(seasonsService.list).mockResolvedValue([{ ...season2026, driverCount: 3 }]);

    renderWithQuery(<SeasonsPage />);

    expect(
      await screen.findByText(/no entra ninguna liga de dos personas/i),
    ).toBeInTheDocument();
  });

  it('muestra "—" y no bloquea el borrado cuando el backend no informa los conteos', async () => {
    // Una Season como la que manda un backend anterior a los conteos.
    const sinConteos: Season = { ...season2026, counts: undefined };
    vi.mocked(seasonsService.list).mockResolvedValue([sinConteos]);

    renderWithQuery(<SeasonsPage />);
    const row = (await screen.findByText('2026')).closest('tr') as HTMLElement;

    // Tres guiones, uno por columna: no se sabe, y no se inventa un cero.
    expect(within(row).getAllByText('—')).toHaveLength(3);
    expect(within(row).getByRole('button', { name: 'Dar de baja' })).toBeEnabled();
  });
});
