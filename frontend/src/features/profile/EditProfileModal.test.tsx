import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../models/user';
import { authService } from '../../services/auth.service';
import { renderWithQuery } from '../../test/render-with-query';
import { EditProfileModal } from './EditProfileModal';

vi.mock('../../services/auth.service');

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
  // El mock es compartido por el archivo: sin esto, las llamadas de un test se arrastran al siguiente.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arranca con el nombre y el lema actuales, contador incluido', () => {
    renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

    expect(screen.getByDisplayValue('Tomás Rivero')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Viejo lema')).toBeInTheDocument();
    // "Viejo lema" pesa 10.
    expect(screen.getByText('10/40')).toBeInTheDocument();
  });

  it('el "?" de Lema explica para qué sirve', async () => {
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

    await u.click(screen.getByRole('button', { name: '¿Qué es el lema?' }));

    expect(screen.getAllByText(/Ver equipo del rival/).length).toBeGreaterThan(0);
  });

  it('el lema no se puede escribir más allá de 40 caracteres', async () => {
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

    const mottoInput = screen.getByDisplayValue('Viejo lema');
    await u.clear(mottoInput);
    await u.type(mottoInput, 'x'.repeat(50));

    expect(screen.getByDisplayValue('x'.repeat(40))).toBeInTheDocument();
    expect(screen.getByText('40/40')).toBeInTheDocument();
  });

  it('Cancelar cierra sin guardar nada', async () => {
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    await u.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  // jsdom no cierra un <dialog> con Escape: se cierra a mano, como lo haria el navegador.
  it('avisa cuando el navegador cierra el diálogo, como con Escape', () => {
    const onClose = vi.fn();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    (screen.getByRole('dialog', { name: 'Editar perfil' }) as HTMLDialogElement).close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Guardar manda el nombre y el lema nuevos, y cierra', async () => {
    vi.mocked(authService.updateProfile).mockResolvedValue({ ...user, name: 'Otro nombre' });
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    const nameInput = screen.getByDisplayValue('Tomás Rivero');
    await u.clear(nameInput);
    await u.type(nameInput, 'Otro nombre');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // [0][0]: react-query agrega un segundo argumento de contexto a mutationFn.
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

    await u.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('si falla el guardado, el popup se queda abierto y muestra el error', async () => {
    vi.mocked(authService.updateProfile).mockRejectedValue(new Error('explotó'));
    const onClose = vi.fn();
    const u = userEvent.setup();
    renderWithQuery(<EditProfileModal user={user} onClose={onClose} />);

    const nameInput = screen.getByDisplayValue('Tomás Rivero');
    await u.clear(nameInput);
    await u.type(nameInput, 'Otro nombre');
    await u.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('explotó')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  describe('quitar la foto', () => {
    it('sin foto no hay nada para quitar: el botón no aparece', () => {
      renderWithQuery(<EditProfileModal user={user} onClose={() => {}} />);

      expect(screen.queryByRole('button', { name: 'Quitar foto de perfil' })).not.toBeInTheDocument();
    });

    it('con foto, aparece el botón de quitar', () => {
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={() => {}} />);

      expect(screen.getByRole('button', { name: 'Quitar foto de perfil' })).toBeInTheDocument();
    });

    it('tocarlo la saca de la vista y el botón desaparece (nada para quitar dos veces)', async () => {
      const u = userEvent.setup();
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={() => {}} />);

      await u.click(screen.getByRole('button', { name: 'Quitar foto de perfil' }));

      expect(screen.queryByRole('button', { name: 'Quitar foto de perfil' })).not.toBeInTheDocument();
    });

    it('Guardar manda removeAvatar cuando se tocó la "x", y cierra', async () => {
      const onClose = vi.fn();
      const u = userEvent.setup();
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={onClose} />);

      await u.click(screen.getByRole('button', { name: 'Quitar foto de perfil' }));
      await u.click(screen.getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(authService.removeAvatar).toHaveBeenCalledTimes(1);
      expect(authService.updateAvatar).not.toHaveBeenCalled();
    });

    it('Cancelar después de tocar la "x" no manda nada', async () => {
      const onClose = vi.fn();
      const u = userEvent.setup();
      renderWithQuery(<EditProfileModal user={userConFoto} onClose={onClose} />);

      await u.click(screen.getByRole('button', { name: 'Quitar foto de perfil' }));
      await u.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(authService.removeAvatar).not.toHaveBeenCalled();
    });
  });
});
