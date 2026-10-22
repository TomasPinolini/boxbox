import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Driver } from '../../models/driver';
import { DriverCard } from './DriverCard';

const driver: Driver = {
  id: 7,
  firstName: 'Max',
  lastName: 'Verstappen',
  number: 1,
  code: 'VER',
  headshotUrl: null,
  constructor: { id: 3, name: 'Red Bull Racing', color: '#3671C6', logoUrl: null },
};

// La franja de escuderia es un <Link>: necesita un Router aunque el componente no haga queries.
function renderCard(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('DriverCard', () => {
  it('muestra nombre, numero y equipo', () => {
    renderCard(<DriverCard driver={driver} onOpen={() => {}} />);

    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Verstappen')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Red Bull Racing')).toBeInTheDocument();
  });

  it('el nombre de la escuderia linkea a su pagina', () => {
    renderCard(<DriverCard driver={driver} onOpen={() => {}} />);

    expect(screen.getByRole('link', { name: /Red Bull Racing/i })).toHaveAttribute(
      'href',
      '/constructors/3',
    );
  });

  it('muestra "Sin equipo" si el piloto no corre esta temporada', () => {
    renderCard(<DriverCard driver={{ ...driver, constructor: null }} onOpen={() => {}} />);

    expect(screen.getByText('Sin equipo')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('avisa el id al abrir', async () => {
    const onOpen = vi.fn();
    renderCard(<DriverCard driver={driver} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: /Ver piloto Max Verstappen/ }));

    expect(onOpen).toHaveBeenCalledWith(7);
  });
});
