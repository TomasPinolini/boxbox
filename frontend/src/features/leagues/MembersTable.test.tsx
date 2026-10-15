import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LeagueMember } from '../../models/league-member';
import { MembersTable } from './MembersTable';

const member = (over: Partial<LeagueMember> = {}): LeagueMember => ({
  id: 1,
  userId: 10,
  isOwner: false,
  status: 'ACTIVE',
  joinedAt: '2026-09-01T00:00:00Z',
  user: { name: 'Tomás Rivero', motto: null, avatarUrl: null },
  ...over,
});

describe('MembersTable', () => {
  // Esta prueba existe por una razon concreta: "Echar" era un link de texto de 20px de alto,
  // el elemento con MENOS peso visual de la pantalla siendo la unica accion destructiva.
  it('expone Echar como boton, con un nombre accesible que dice a quien se echa', () => {
    render(<MembersTable members={[member()]} canKick onKick={() => {}} />);
    const boton = screen.getByRole('button', { name: 'Echar a Tomás Rivero de la liga' });
    expect(boton).toBeInTheDocument();
  });

  it('no ofrece echar al owner ni cuando el roster esta cerrado', () => {
    const { rerender } = render(
      <MembersTable members={[member({ isOwner: true })]} canKick onKick={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: /^Echar/ })).not.toBeInTheDocument();

    rerender(<MembersTable members={[member()]} canKick={false} onKick={() => {}} />);
    expect(screen.queryByRole('button', { name: /^Echar/ })).not.toBeInTheDocument();
  });

  // Echar es irreversible desde la UI (sin reinvitarla, no vuelve a entrar) — dos clicks,
  // como "Archivar liga" y "Salir de la liga" en la misma pantalla.
  it('pide confirmar antes de llamar onKick, y recien ahi manda el userId', async () => {
    const onKick = vi.fn();
    render(<MembersTable members={[member({ id: 1, userId: 99 })]} canKick onKick={onKick} />);

    await userEvent.click(screen.getByRole('button', { name: /^Echar/ }));
    expect(onKick).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Tomás Rivero');

    await userEvent.click(screen.getByRole('button', { name: 'Sí, echar' }));
    expect(onKick).toHaveBeenCalledWith(99);
  });

  it('Cancelar en la confirmacion no llama onKick', async () => {
    const onKick = vi.fn();
    render(<MembersTable members={[member()]} canKick onKick={onKick} />);

    await userEvent.click(screen.getByRole('button', { name: /^Echar/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onKick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Echar/ })).toBeInTheDocument();
  });
});
