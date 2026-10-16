import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../models/user';
import { authService } from '../../services/auth.service';
import { renderWithQuery } from '../../test/render-with-query';
import { EditProfileModal } from './EditProfileModal';

vi.mock('../../services/auth.service');

// getAllBy* y no getBy*, [0] y no una queja por "found multiple elements": el popup tiene DOS
// copias de todo en el DOM a propósito (la hoja de mobile y el diálogo de escritorio, CSS
// decide cuál se ve y jsdom no aplica CSS) — mismo criterio documentado en HelpPopover.test.tsx.
// Las dos comparten el mismo estado de React (name/motto), así que interactuar con la copia [0]
// alcanza: la [1] se actualiza sola.

const user: User = {
  id: 1,
  email: 'tomas@boxbox.test',
  name: 'Tomás Rivero',
  avatarUrl: null,
  motto: 'Viejo lema',
  role: 'USER',
};

const userConFoto: User = { ...user, avatarUrl: 'https://cdn.test/tomas.jpg' };

describe('EditProfileModal', () => {
  // vi.mock() auto-mockea el módulo una sola vez, compartido entre los tests de este archivo
  // — sin esto, el historial de llamadas de un test se arrastra al siguiente.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arranca con el nombre y el lema actuales, contador incluido', () => {
    renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

    expect(screen.getAllByDisplayValue('Tomás Rivero')).toHaveLength(2);
    expect(screen.getAllByDisplayValue('Viejo lema')).toHaveLength(2);
    // "Viejo lema" pesa 10.
    expect(screen.getAllByText('10/40')).toHaveLength(2);
  });

  it('el "?" de Lema explica para qué sirve', async () => {
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

    await u.click(screen.getAllByRole('button', { name: '¿Qué es el lema?' })[0]);

    expect(screen.getAllByText(/Ver equipo del rival/).length).toBeGreaterThan(0);
  });

  it('el lema no se puede escribir más allá de 40 caracteres', async () => {
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

    const [mottoInput] = screen.getAllByDisplayValue('Viejo lema');
    await u.clear(mottoInput);
    await u.type(mottoInput, 'x'.repeat(50));

    expect(screen.getAllByDisplayValue('x'.repeat(40))).toHaveLength(2);
    expect(screen.getAllByText('40/40')).toHaveLength(2);
  });

  it('Cancelar cierra sin guardar nada', async () => {
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    await u.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('cierra con Escape', async () => {
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    await u.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Guardar manda el nombre y el lema nuevos, y cierra', async () => {
    vi.mocked(authService.updateProfile).mockResolvedValue({ ...user, name: 'Otro nombre' });
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    const [nameInput] = screen.getAllByDisplayValue('Tomás Rivero');
    await u.clear(nameInput);
    await u.type(nameInput, 'Otro nombre');
    await u.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // [0][0]: react-query le agrega un segundo argumento de contexto a mutationFn, no nos
    // importa acá — solo qué le pasó EditProfileModal, el primer argumento.
    expect(vi.mocked(authService.updateProfile).mock.calls[0][0]).toEqual({
      name: 'Otro nombre',
      motto: 'Viejo lema',
    });
    // Sin foto nueva: updateAvatar nunca se llama, no hay nada que subir.
    expect(authService.updateAvatar).not.toHaveBeenCalled();
  });

  it('si nombre y lema no cambiaron, Guardar no llama a updateProfile', async () => {
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    await u.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('si falla el guardado, el popup se queda abierto y muestra el error', async () => {
    vi.mocked(authService.updateProfile).mockRejectedValue(new Error('explotó'));
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    const [nameInput] = screen.getAllByDisplayValue('Tomás Rivero');
    await u.clear(nameInput);
    await u.type(nameInput, 'Otro nombre');
    await u.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

    expect(await screen.findAllByText('explotó')).not.toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  // Badge "x" de sacar la foto — wireframeado y aprobado por el usuario 2026-10-16.
  describe('quitar la foto', () => {
    it('sin foto no hay nada para quitar: el botón no aparece', () => {
      renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

      expect(screen.queryByRole('button', { name: 'Quitar foto de perfil' })).not.toBeInTheDocument();
    });

    it('con foto, aparece el botón de quitar', () => {
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={() => {}} />);

      expect(screen.getAllByRole('button', { name: 'Quitar foto de perfil' })).toHaveLength(2);
    });

    it('tocarlo la saca de la vista y el botón desaparece (nada para quitar dos veces)', async () => {
      const u = userEvent.setup();
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={() => {}} />);

      await u.click(screen.getAllByRole('button', { name: 'Quitar foto de perfil' })[0]);

      expect(screen.queryByRole('button', { name: 'Quitar foto de perfil' })).not.toBeInTheDocument();
    });

    it('Guardar manda removeAvatar cuando se tocó la "x", y cierra', async () => {
      const onClose = vi.fn();
      const u = userEvent.setup();
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={onClose} />);

      await u.click(screen.getAllByRole('button', { name: 'Quitar foto de perfil' })[0]);
      await u.click(screen.getAllByRole('button', { name: 'Guardar' })[0]);

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(authService.removeAvatar).toHaveBeenCalledTimes(1);
      expect(authService.updateAvatar).not.toHaveBeenCalled();
    });

    it('Cancelar después de tocar la "x" no manda nada', async () => {
      const onClose = vi.fn();
      const u = userEvent.setup();
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={onClose} />);

      await u.click(screen.getAllByRole('button', { name: 'Quitar foto de perfil' })[0]);
      await u.click(screen.getAllByRole('button', { name: 'Cancelar' })[0]);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(authService.removeAvatar).not.toHaveBeenCalled();
    });
  });
});
