import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { RequireAuth } from './RequireAuth';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>pagina de login</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/leagues" element={<p>mis ligas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('sin token redirige a /login', () => {
    renderAt('/leagues');
    expect(screen.getByText('pagina de login')).toBeInTheDocument();
  });

  it('con token renderiza la ruta protegida', () => {
    useAuthStore
      .getState()
      .setSession({ id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, role: 'USER' }, 'tok');
    renderAt('/leagues');
    expect(screen.getByText('mis ligas')).toBeInTheDocument();
  });
});
