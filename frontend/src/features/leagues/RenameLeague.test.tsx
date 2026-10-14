import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RenameLeague } from './RenameLeague';

describe('RenameLeague', () => {
  it('no muestra el formulario hasta que lo piden', () => {
    render(<RenameLeague currentName="Liga de los pibes" onRename={() => {}} />);

    expect(screen.getByRole('button', { name: 'Editar nombre de la liga' })).toBeInTheDocument();
    expect(screen.getByText('Liga de los pibes')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('abre el formulario con el nombre actual cargado', async () => {
    const user = userEvent.setup();
    render(<RenameLeague currentName="Liga de los pibes" onRename={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Editar nombre de la liga' }));

    expect(screen.getByLabelText('Nombre de la liga')).toHaveValue('Liga de los pibes');
  });

  it('avisa el nombre nuevo y cierra el formulario', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<RenameLeague currentName="Liga de los pibes" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Editar nombre de la liga' }));
    const input = screen.getByLabelText('Nombre de la liga');
    await user.clear(input);
    await user.type(input, 'Liga de las pibas');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onRename).toHaveBeenCalledWith('Liga de las pibas');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('cancelar cierra sin avisar nada', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<RenameLeague currentName="Liga de los pibes" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Editar nombre de la liga' }));
    await user.type(screen.getByLabelText('Nombre de la liga'), ' y las pibas');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('no deja guardar un nombre vacío', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<RenameLeague currentName="Liga de los pibes" onRename={onRename} />);

    await user.click(screen.getByRole('button', { name: 'Editar nombre de la liga' }));
    await user.clear(screen.getByLabelText('Nombre de la liga'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onRename).not.toHaveBeenCalled();
    // El formulario sigue abierto para que se pueda corregir, con el error a la vista. El
    // input lleva aria-label (no un <label> que lo envuelva), asi que el error en un <span>
    // aparte no le cambia el nombre accesible.
    expect(screen.getByLabelText('Nombre de la liga')).toBeInTheDocument();
    expect(screen.getByText('Poné un nombre')).toBeInTheDocument();
  });

  it('se puede deshabilitar mientras hay algo en vuelo', () => {
    render(<RenameLeague currentName="Liga" onRename={() => {}} disabled />);

    expect(screen.getByRole('button', { name: 'Editar nombre de la liga' })).toBeDisabled();
  });
});
