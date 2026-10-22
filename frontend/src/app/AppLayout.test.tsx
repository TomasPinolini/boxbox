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
    .setSession({ id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, motto: null, role }, 'tok');
  return renderWithQuery(<AppLayout />);
}

describe('AppLayout — navegacion', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('un ADMIN ve los links de carga agrupados en el menu de cuenta', async () => {
    renderAs('ADMIN');
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta de Ana' }));

    // menuitem, no link: el role explicito de AdminLinksGroup pisa el implicito del <a>.
    const menu = screen.getByRole('menu', { name: 'Opciones de la cuenta' });
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

    const menu = screen.getByRole('menu', { name: 'Opciones de la cuenta' });
    expect(menu).not.toHaveTextContent('Carga');
    expect(screen.queryByRole('menuitem', { name: 'Resultados' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Campeonato' })).toBeInTheDocument();
  });

  it('un ADMIN ve el grupo de carga en el drawer mobile', async () => {
    renderAs('ADMIN');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const drawer = screen.getByRole('dialog', { name: 'Menú de navegación' });
    expect(drawer).toHaveTextContent('Carga');
    expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'href',
      '/admin/results',
    );
  });

  it('desde el drawer mobile se puede abrir Editar perfil', async () => {
    renderAs('USER');
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));

    expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeInTheDocument();
  });

  // La barra se ve tambien sin sesion, porque /drivers y /standings son publicas.
  it('sin sesion muestra Ingresar y no el menu de cuenta', () => {
    renderWithQuery(<AppLayout />);
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /Cuenta de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Mis ligas' })).not.toBeInTheDocument();
  });

  it('con sesion el menu de cuenta muestra el nombre y cerrar sesion', async () => {
    renderAs('USER');
    const trigger = screen.getByRole('button', { name: 'Cuenta de Ana' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    const menu = screen.getByRole('menu', { name: 'Opciones de la cuenta' });
    expect(menu).toHaveTextContent('Ana');
    expect(screen.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis ligas' })).toHaveAttribute('href', '/leagues');
  });
});
