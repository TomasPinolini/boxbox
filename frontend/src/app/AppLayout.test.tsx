import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { UserRole } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { renderWithQuery } from '../test/render-with-query';
import { AppLayout } from './AppLayout';

function renderAs(role: UserRole) {
  useAuthStore
    .getState()
    .setSession({ id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, role }, 'tok');
  return renderWithQuery(<AppLayout />);
}

// Esta navegacion ya se perdio una vez resolviendo un conflicto de merge (PR #33 vs #34) y
// ningun test lo noto. Los links conviven en el mismo bloque: se testean juntos.
//
// El test vivia en features/leagues/LeaguesPage.test.tsx, porque hasta el 2026-10-07 cada
// pagina armaba sus propios links. Se mudo junto con la navegacion a AppLayout; las
// aserciones son las mismas.
describe('AppLayout — navegacion', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
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

  // La barra se ve tambien sin sesion, porque /drivers y /standings son publicas.
  it('sin sesion muestra Ingresar y no el menu de cuenta', () => {
    renderWithQuery(<AppLayout />);
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /Cuenta de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mis ligas' })).not.toBeInTheDocument();
  });

  // Reemplaza nombre + "Salir" sueltos en la barra: con sesion aparece un boton de cuenta
  // (el avatar) que al clickear despliega el nombre y "Cerrar sesion" — pedido del usuario
  // 2026-10-15, mismo patron que Gmail/GitHub/Slack.
  it('con sesion el menu de cuenta muestra el nombre y cerrar sesion', async () => {
    renderAs('USER');
    const trigger = screen.getByRole('button', { name: 'Cuenta de Ana' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(menu).toHaveTextContent('Ana');
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis ligas' })).toHaveAttribute('href', '/leagues');
  });
});
