import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRole } from '../../models/user';
import { leaguesService } from '../../services/leagues.service';
import { useAuthStore } from '../../store/auth.store';
import { renderWithQuery } from '../../test/render-with-query';
import { LeaguesPage } from './LeaguesPage';

vi.mock('../../services/leagues.service');

function renderAs(role: UserRole) {
  useAuthStore
    .getState()
    .setSession({ id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, role }, 'tok');
  return renderWithQuery(<LeaguesPage />);
}

// Esta navegacion ya se perdio una vez resolviendo un conflicto de merge (PR #33 vs #34) y
// ningun test lo noto. Los dos links conviven en el mismo bloque: se testean juntos.
describe('LeaguesPage — navegacion', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    vi.mocked(leaguesService.list).mockResolvedValue([]);
  });

  it('un ADMIN ve el link a la carga de resultados', () => {
    renderAs('ADMIN');
    expect(screen.getByRole('link', { name: 'Cargar resultados' })).toHaveAttribute(
      'href',
      '/admin/results',
    );
    expect(screen.getByRole('link', { name: 'Campeonato' })).toHaveAttribute('href', '/standings');
  });

  it('un USER no lo ve', () => {
    renderAs('USER');
    expect(screen.queryByRole('link', { name: 'Cargar resultados' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campeonato' })).toBeInTheDocument();
  });
});
