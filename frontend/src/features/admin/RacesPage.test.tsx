import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Circuit } from '../../models/circuit';
import type { Race } from '../../models/race';
import type { Season } from '../../models/season';
import { ApiError } from '../../services/api-error';
import { circuitsService } from '../../services/circuits.service';
import { racesService } from '../../services/races.service';
import { seasonsService } from '../../services/seasons.service';
import { renderWithQuery } from '../../test/render-with-query';
import { RacesPage } from './RacesPage';

// Se mockean los servicios, no axios: el contrato que le importa a la pantalla es el del servicio.
vi.mock('../../services/races.service');
vi.mock('../../services/seasons.service');
vi.mock('../../services/circuits.service');

const temporada2026: Season = { id: 1, year: 2026, isActive: true, driverCount: 22 };
const temporada2025: Season = { id: 2, year: 2025, isActive: false, driverCount: 20 };

const silverstone: Circuit = {
  id: 10,
  name: 'Silverstone',
  country: 'Reino Unido',
  city: 'Silverstone',
  circuitLength: 5.891,
  externalId: 'silverstone',
};

const monza: Circuit = {
  id: 11,
  name: 'Monza',
  country: 'Italia',
  city: 'Monza',
  circuitLength: 5.793,
  externalId: 'monza',
};

const britanico: Race = {
  id: 100,
  name: 'Gran Premio de Gran Bretaña',
  round: 12,
  date: '2026-07-05T14:00:00.000Z',
  qualifyingDate: null,
  sprintDate: null,
  status: 'UPCOMING',
  seasonId: 1,
  circuitId: 10,
  circuit: silverstone,
};

const italiano: Race = {
  id: 101,
  name: 'Gran Premio de Italia',
  round: 16,
  date: '2026-09-06T13:00:00.000Z',
  qualifyingDate: '2026-09-05T13:00:00.000Z',
  sprintDate: null,
  status: 'COMPLETED',
  seasonId: 1,
  circuitId: 11,
  circuit: monza,
};

beforeEach(() => {
  // El config de vitest no limpia los mocks entre tests, asi que el historial de llamadas se
  // arrastra: sin esto, un `not.toHaveBeenCalled()` ve la llamada del test anterior.
  vi.resetAllMocks();
  vi.mocked(racesService.list).mockResolvedValue([britanico, italiano]);
  vi.mocked(seasonsService.list).mockResolvedValue([temporada2026, temporada2025]);
  vi.mocked(circuitsService.list).mockResolvedValue([silverstone, monza]);
});

describe('RacesPage', () => {
  it('lista las carreras con nombres y no con ids', async () => {
    renderWithQuery(<RacesPage />);

    const fila = (await screen.findByText('Gran Premio de Gran Bretaña')).closest(
      'tr',
    ) as HTMLElement;
    // Circuito y temporada por nombre/año: el id no le dice nada a nadie.
    expect(within(fila).getByText('Silverstone')).toBeInTheDocument();
    expect(within(fila).getByText('2026')).toBeInTheDocument();
    expect(within(fila).getByText('Por correr')).toBeInTheDocument();
    expect(within(fila).getByText('12')).toBeInTheDocument();
  });

  it('traduce el estado del backend', async () => {
    renderWithQuery(<RacesPage />);
    const fila = (await screen.findByText('Gran Premio de Italia')).closest('tr') as HTMLElement;
    expect(within(fila).getByText('Corrida')).toBeInTheDocument();
  });

  it('ordena por temporada más nueva y después por ronda', async () => {
    const viejo: Race = { ...italiano, id: 102, seasonId: 2, round: 1, name: 'GP de 2025' };
    vi.mocked(racesService.list).mockResolvedValue([viejo, italiano, britanico]);

    renderWithQuery(<RacesPage />);
    await screen.findByText('GP de 2025');

    const nombres = screen
      .getAllByRole('row')
      .slice(1)
      .map((fila) => fila.querySelectorAll('td')[1]?.textContent);
    // 2026 primero (ronda 12 antes que 16), 2025 al final aunque su ronda sea la 1.
    expect(nombres).toEqual(['Gran Premio de Gran Bretaña', 'Gran Premio de Italia', 'GP de 2025']);
  });

  it('crea una carrera mandando las fechas en ISO con zona', async () => {
    const user = userEvent.setup();
    vi.mocked(racesService.create).mockResolvedValue(britanico);

    renderWithQuery(<RacesPage />);
    await screen.findByText('Gran Premio de Italia');

    await user.type(screen.getByLabelText('Nombre'), 'GP de Bélgica');
    await user.type(screen.getByLabelText('Ronda'), '13');
    await user.selectOptions(screen.getByLabelText('Temporada'), '1');
    await user.selectOptions(screen.getByLabelText('Circuito'), '10');
    await user.type(screen.getByLabelText('Fecha de carrera'), '2026-07-26T15:00');
    await user.click(screen.getByRole('button', { name: 'Crear carrera' }));

    await waitFor(() => expect(racesService.create).toHaveBeenCalled());
    const enviado = vi.mocked(racesService.create).mock.calls[0][0];
    expect(enviado.name).toBe('GP de Bélgica');
    // round y los dos ids viajan como número, no como el string del <input>/<select>.
    expect(enviado.round).toBe(13);
    expect(enviado.seasonId).toBe(1);
    expect(enviado.circuitId).toBe(10);
    // El backend exige ISO 8601 con zona; el input no la trae.
    expect(enviado.date).toMatch(/Z$/);
    // Las opcionales vacías no viajan: el schema del backend las tiene optional, no nullable.
    expect(enviado.qualifyingDate).toBeUndefined();
    expect(enviado.sprintDate).toBeUndefined();
  });

  it('no deja crear sin temporada ni circuito', async () => {
    const user = userEvent.setup();

    renderWithQuery(<RacesPage />);
    await screen.findByText('Gran Premio de Italia');

    await user.type(screen.getByLabelText('Nombre'), 'GP sin datos');
    await user.type(screen.getByLabelText('Ronda'), '1');
    await user.type(screen.getByLabelText('Fecha de carrera'), '2026-07-26T15:00');
    await user.click(screen.getByRole('button', { name: 'Crear carrera' }));

    // Un "Obligatorio" por cada <select> sin elegir: temporada y circuito.
    expect(await screen.findAllByText('Obligatorio')).toHaveLength(2);
    expect(racesService.create).not.toHaveBeenCalled();
  });

  it('edita una carrera y el formulario llega con la fecha ya cargada', async () => {
    const user = userEvent.setup();
    const editada = { ...britanico, name: 'GP de Gran Bretaña (Silverstone)' };
    vi.mocked(racesService.list)
      .mockResolvedValueOnce([britanico, italiano])
      .mockResolvedValue([editada, italiano]);
    vi.mocked(racesService.update).mockResolvedValue(editada);

    renderWithQuery(<RacesPage />);
    await user.click(
      await screen.findByRole('button', { name: 'Editar Gran Premio de Gran Bretaña' }),
    );

    expect(screen.getByLabelText('Nombre')).toHaveValue('Gran Premio de Gran Bretaña');
    expect(screen.getByLabelText('Ronda')).toHaveValue(12);
    // toHaveValue no acepta un matcher asimétrico. El dia puede ser 04 o 05 segun el huso del
    // que corra el test: lo que se afirma es el formato.
    expect((screen.getByLabelText('Fecha de carrera') as HTMLInputElement).value).toMatch(
      /^2026-07-0[45]T\d{2}:\d{2}$/,
    );

    const nombre = screen.getByLabelText('Nombre');
    await user.clear(nombre);
    await user.type(nombre, 'GP de Gran Bretaña (Silverstone)');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(racesService.update).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ name: 'GP de Gran Bretaña (Silverstone)' }),
      ),
    );
  });

  it('borra una carrera recién después de confirmar', async () => {
    const user = userEvent.setup();
    vi.mocked(racesService.list)
      .mockResolvedValueOnce([britanico, italiano])
      .mockResolvedValue([italiano]);
    vi.mocked(racesService.remove).mockResolvedValue(undefined);

    renderWithQuery(<RacesPage />);
    const fila = (await screen.findByText('Gran Premio de Gran Bretaña')).closest(
      'tr',
    ) as HTMLElement;

    await user.click(
      within(fila).getByRole('button', { name: 'Borrar Gran Premio de Gran Bretaña' }),
    );
    // La consecuencia dice que el borrado es físico, no una baja lógica como en circuitos.
    expect(within(fila).getByRole('alert')).toHaveTextContent('se borra de la base');
    expect(racesService.remove).not.toHaveBeenCalled();

    await user.click(within(fila).getByRole('button', { name: 'Confirmar borrado' }));
    await waitFor(() => expect(racesService.remove).toHaveBeenCalledWith(100));
    await waitFor(() =>
      expect(screen.queryByText('Gran Premio de Gran Bretaña')).not.toBeInTheDocument(),
    );
  });

  // Sin la guarda del backend esto llegaba como 500 y la pantalla decía "Algo salió mal".
  it('muestra en castellano el rechazo de una carrera con resultados', async () => {
    const user = userEvent.setup();
    vi.mocked(racesService.remove).mockRejectedValue(
      new ApiError('RACE_HAS_DEPENDENCIES', 409, 'Cannot delete race with results or standings'),
    );

    renderWithQuery(<RacesPage />);
    const fila = (await screen.findByText('Gran Premio de Italia')).closest('tr') as HTMLElement;
    await user.click(within(fila).getByRole('button', { name: 'Borrar Gran Premio de Italia' }));
    await user.click(within(fila).getByRole('button', { name: 'Confirmar borrado' }));

    expect(
      await screen.findByText('No se puede borrar: la carrera ya tiene resultados cargados'),
    ).toBeInTheDocument();
  });
});
