import { describe, expect, it, vi } from 'vitest';
import { apiClient } from './api-client';
import { seasonsService } from './seasons.service';

vi.mock('./api-client');

describe('seasonsService.list', () => {
  it('deja los conteos sin definir cuando el backend no los manda', async () => {
    // Un backend anterior a este cambio no devuelve `counts`. Pasa de verdad: el deploy de
    // Render puede ir una version atras del frontend. No se rellena con ceros: una temporada
    // con ligas diria que no tiene ninguna.
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 1, year: 2026, isActive: true, driverCount: 22 },
    ]);

    const [season] = await seasonsService.list();

    expect(season.counts).toBeUndefined();
  });

  it('respeta los conteos que vienen del backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 1, year: 2026, isActive: true, driverCount: 22, counts: { races: 24, leagues: 2, drivers: 21 } },
    ]);

    const [season] = await seasonsService.list();

    expect(season.counts).toEqual({ races: 24, leagues: 2, drivers: 21 });
  });
});
