import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Position } from './Position';

describe('Position', () => {
  // Lo que importa del podio no es el color: es que el numero siga siendo el dato.
  it('muestra el numero tal cual en el podio y fuera de el', () => {
    render(
      <>
        <Position value={1} />
        <Position value={4} />
      </>,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('pinta los tres primeros y deja el resto sin pildora', () => {
    const { container } = render(
      <>
        <Position value={1} />
        <Position value={2} />
        <Position value={3} />
        <Position value={4} />
      </>,
    );
    const pintados = container.querySelectorAll('.rounded-full');
    expect(pintados).toHaveLength(3);
  });

  it('dibuja un guion cuando no hay posicion, no un cero', () => {
    render(<Position value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
