import { screen } from '@testing-library/react';
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
    },
    {
      raceId: 11,
      raceName: 'GP de Brasil',
      round: 2,
      raceDate: '2026-11-08T18:00:00.000Z',
      driver1Points: 6,
      driver2Points: 2,
      totalPoints: 8,
    },
  ],
};

describe('ConstructorDetailPage', () => {
  it('muestra la escudería, sus pilotos de la temporada y el historial', async () => {
    vi.mocked(constructorsService.get).mockResolvedValue(williams);

    renderWithQuery(<ConstructorDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Williams' })).toBeInTheDocument();
    expect(screen.getByText('Albon')).toBeInTheDocument();
    expect(screen.getByText('Sainz')).toBeInTheDocument();
    expect(screen.getByText('GP de Italia')).toBeInTheDocument();
    expect(screen.getByText('GP de Brasil')).toBeInTheDocument();
    // Los puntos totales de la temporada, que es el dato que se viene a buscar.
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
});
