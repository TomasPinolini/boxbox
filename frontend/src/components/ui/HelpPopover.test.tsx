import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HelpPopover } from './HelpPopover';

// getAllBy* y no getBy*: abierto hay dos copias en el DOM (mobile y desktop) y jsdom no aplica
// el CSS que oculta una.
describe('HelpPopover', () => {
  it('arranca cerrado', () => {
    render(<HelpPopover title="¿Por qué el tope es 11?">Porque hay 22 pilotos.</HelpPopover>);

    expect(screen.getByRole('button', { name: '¿Por qué el tope es 11?' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByText('Porque hay 22 pilotos.')).not.toBeInTheDocument();
  });

  it('abre al tocar el gatillo y muestra el texto', async () => {
    const user = userEvent.setup();
    render(<HelpPopover title="¿Por qué el tope es 11?">Porque hay 22 pilotos.</HelpPopover>);

    await user.click(screen.getByRole('button', { name: '¿Por qué el tope es 11?' }));

    expect(screen.getAllByText('Porque hay 22 pilotos.')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '¿Por qué el tope es 11?' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('cierra con Escape y devuelve el foco al gatillo', async () => {
    const user = userEvent.setup();
    render(<HelpPopover title="¿Por qué el tope es 11?">Porque hay 22 pilotos.</HelpPopover>);
    const gatillo = screen.getByRole('button', { name: '¿Por qué el tope es 11?' });

    await user.click(gatillo);
    await user.keyboard('{Escape}');

    expect(screen.queryByText('Porque hay 22 pilotos.')).not.toBeInTheDocument();
    expect(gatillo).toHaveFocus();
  });

  it('con triggerText el texto ES el nombre accesible, sin aria-label', () => {
    render(
      <HelpPopover title="¿Qué es BoxBox?" triggerText="¿Qué es BoxBox?" placement="top">
        Una fantasy league de Fórmula 1.
      </HelpPopover>,
    );

    const gatillo = screen.getByRole('button', { name: '¿Qué es BoxBox?' });
    expect(gatillo).not.toHaveAttribute('aria-label');
    expect(gatillo).toHaveTextContent('¿Qué es BoxBox?');
  });
});
