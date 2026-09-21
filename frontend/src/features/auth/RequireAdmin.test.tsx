import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UserRole } from '../../models/user';
import { useAuthStore } from '../../store/auth.store';
import { RequireAdmin } from './RequireAdmin';

function renderAs(role: UserRole) {
  useAuthStore
    .getState()
    .setSession({ id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, role }, 'tok');
  return render(
    <MemoryRouter initialEntries={['/admin/results']}>
      <Routes>
        <Route path="/leagues" element={<p>mis ligas</p>} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin/results" element={<p>carga de resultados</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('un USER que entra por URL vuelve a /leagues', () => {
    renderAs('USER');
    expect(screen.getByText('mis ligas')).toBeInTheDocument();
    expect(screen.queryByText('carga de resultados')).not.toBeInTheDocument();
  });

  it('un ADMIN ve la ruta', () => {
    renderAs('ADMIN');
    expect(screen.getByText('carga de resultados')).toBeInTheDocument();
  });
});
