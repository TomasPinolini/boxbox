import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

function renderModal(onClose = vi.fn()) {
  render(
    <Modal label="Prueba" onClose={onClose} className="">
      <div>
        <button type="button">adentro</button>
        <input data-autofocus aria-label="campo" />
      </div>
    </Modal>,
  );
  return { onClose, dialog: screen.getByRole('dialog', { name: 'Prueba' }) as HTMLDialogElement };
}

describe('Modal', () => {
  it('abre como modal y pone el foco en el elemento con data-autofocus', () => {
    const { dialog } = renderModal();

    expect(dialog.open).toBe(true);
    expect(screen.getByRole('textbox', { name: 'campo' })).toHaveFocus();
  });

  it('un click en el fondo cierra; uno adentro, o una selección soltada afuera, no', () => {
    const { onClose, dialog } = renderModal();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'adentro' }));
    fireEvent.click(dialog);
    fireEvent.click(screen.getByRole('button', { name: 'adentro' }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('avisa cuando el navegador lo cierra, como con Escape', () => {
    const { onClose, dialog } = renderModal();

    dialog.close();

    expect(onClose).toHaveBeenCalledOnce();
  });

  // StrictMode monta, limpia y vuelve a montar: esa limpieza no puede cerrar el modal.
  it('bajo StrictMode queda abierto y no avisa ningún cierre', () => {
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Modal label="Prueba" onClose={onClose} className="">
          <p>hola</p>
        </Modal>
      </StrictMode>,
    );

    expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});
