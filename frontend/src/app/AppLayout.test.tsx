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

  // Los links de carga (Resultados/Temporadas/Circuitos) viven agrupados bajo "Carga" — en
  // escritorio adentro del menu de cuenta, no sueltos en la barra. Pedido del usuario
  // 2026-10-15: son una capacidad del rol, no navegacion de catalogo como Pilotos/Campeonato.
  it('un ADMIN ve los links de carga agrupados en el menu de cuenta', async () => {
    renderAs('ADMIN');
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta de Ana' }));

    // menuitem, no link: AdminLinksGroup pone role="menuitem" en estos <a> adentro de
    // UserMenu (asMenuItems), siguiendo el patron ARIA de menu — un role explicito pisa el
    // implicito del elemento.
    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(menu).toHaveTextContent('Carga');
    expect(screen.getByRole('menuitem', { name: 'Resultados' })).toHaveAttribute(
      'href',
      '/admin/results',
    );
    expect(screen.getByRole('menuitem', { name: 'Temporadas' })).toHaveAttribute(
      'href',
      '/admin/seasons',
    );
    expect(screen.getByRole('menuitem', { name: 'Circuitos' })).toHaveAttribute(
      'href',
      '/admin/circuits',
    );
    expect(screen.getByRole('link', { name: 'Campeonato' })).toHaveAttribute('href', '/standings');
  });

  it('un USER no ve el grupo de carga', async () => {
    renderAs('USER');
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta de Ana' }));

    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(menu).not.toHaveTextContent('Carga');
    expect(screen.queryByRole('menuitem', { name: 'Resultados' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campeonato' })).toBeInTheDocument();
  });

  // Mismos tres links, pero en el drawer mobile no se movieron de la lista de navegacion —
  // pedido explicito del usuario: ahi se quedan, solo agrupados con su propio label "Carga".
  it('un ADMIN ve el grupo de carga en el drawer mobile', async () => {
    renderAs('ADMIN');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const drawer = screen.getByRole('dialog', { name: 'Menú' });
    expect(drawer).toHaveTextContent('Carga');
    expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'href',
      '/admin/results',
    );
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
