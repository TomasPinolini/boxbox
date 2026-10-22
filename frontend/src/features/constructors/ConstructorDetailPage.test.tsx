import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ConstructorDetail } from '../../models/constructor';
import { constructorsService } from '../../services/constructors.service';
import { renderWithQuery } from '../../test/render-with-query';
import { ConstructorDetailPage } from './ConstructorDetailPage';

vi.mock('../../services/constructors.service');
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof import('react-router-dom')>()),
  useParams: () => ({ id: '3' }),
}));

const williams: ConstructorDetail = {
  id: 3,
  name: 'Williams',
  color: '#64C4FF',
  logoUrl: null,
  seasonId: 1,
  drivers: [
    { id: 1, firstName: 'Alex', lastName: 'Albon', number: 23, code: 'ALB', headshotUrl: null },
    { id: 2, firstName: 'Carlos', lastName: 'Sainz', number: 55, code: 'SAI', headshotUrl: null },
  ],
  stats: { races: 2, points: 34 },
  results: [
    {
      raceId: 10,
      raceName: 'GP de Italia',
      round: 1,
      raceDate: '2026-09-06T13:00:00.000Z',
      driver1Points: 18,
      driver2Points: 8,
      totalPoints: 26,
      pointsByDriverId: { 1: 18, 2: 8 },
    },
    {
      raceId: 11,
      raceName: 'GP de Brasil',
      round: 2,
      raceDate: '2026-11-08T18:00:00.000Z',
      driver1Points: 6,
      driver2Points: 2,
      totalPoints: 8,
      pointsByDriverId: { 1: 2, 2: 6 },
    },
  ],
};

describe('ConstructorDetailPage', () => {
  it('muestra la escudería, sus pilotos de la temporada y el historial', async () => {
    vi.mocked(constructorsService.get).mockResolvedValue(williams);

    renderWithQuery(<ConstructorDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Williams' })).toBeInTheDocument();
    // Por rol y no por texto: el apellido aparece en la lista y en el encabezado de columna.
    expect(screen.getByRole('link', { name: /Albon/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sainz/ })).toBeInTheDocument();
    expect(screen.getByText('GP de Italia')).toBeInTheDocument();
    expect(screen.getByText('GP de Brasil')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
  });

  it('cada piloto linkea a su propio detalle', async () => {
    vi.mocked(constructorsService.get).mockResolvedValue(williams);

    renderWithQuery(<ConstructorDetailPage />);

    expect(await screen.findByRole('link', { name: /Albon/ })).toHaveAttribute(
      'href',
      '/drivers/1',
    );
  });

  it('sin temporada activa lo dice en vez de mostrar tablas vacías', async () => {
    vi.mocked(constructorsService.get).mockResolvedValue({
      ...williams,
      seasonId: null,
      drivers: [],
      stats: { races: 0, points: 0 },
      results: [],
    });

    renderWithQuery(<ConstructorDetailPage />);

    expect(await screen.findByText(/todavía no tiene carreras procesadas/i)).toBeInTheDocument();
  });

  it('la tabla tiene una columna por piloto, con su apellido', async () => {
    vi.mocked(constructorsService.get).mockResolvedValue(williams);

    renderWithQuery(<ConstructorDetailPage />);
    await screen.findByText('Resultados');

    const encabezados = screen.getAllByRole('columnheader').map((th) => th.textContent);
    expect(encabezados).toEqual(['#', 'Carrera', 'Albon', 'Sainz', 'Total']);

    // Y los puntos van a la columna del que los hizo: en Brasil, Sainz 6 y Albon 2.
    const brasil = (await screen.findByText('GP de Brasil')).closest('tr') as HTMLElement;
    const celdas = within(brasil).getAllByRole('cell').map((td) => td.textContent);
    expect(celdas).toEqual(['2', 'GP de Brasil', '2', '6', '8']);
  });

  it('muestra "—" si el backend no manda el desglose por piloto', async () => {
    const sinDesglose = {
      ...williams,
      // Como lo manda un backend anterior a este desglose.
      results: williams.results.map((r) => ({ ...r, pointsByDriverId: undefined })),
    };
    vi.mocked(constructorsService.get).mockResolvedValue(sinDesglose);

    renderWithQuery(<ConstructorDetailPage />);
    const brasil = (await screen.findByText('GP de Brasil')).closest('tr') as HTMLElement;

    // Un cero afirmaria que no sumaron nada; el guion dice que no sabemos.
    expect(within(brasil).getAllByText('—')).toHaveLength(2);
  });
});
