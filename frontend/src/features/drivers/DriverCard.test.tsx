import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  constructor: { id: 3, name: 'Red Bull Racing', color: '#3671C6' },
};

// Componente puro, sin queries ni router: se renderiza directo, igual que LeagueCard.test.tsx.
describe('DriverCard', () => {
  it('muestra nombre, numero y equipo', () => {
    render(<DriverCard driver={driver} onOpen={() => {}} />);

    expect(screen.getByText('Max Verstappen')).toBeInTheDocument();
    expect(screen.getByText(/#1/)).toBeInTheDocument();
    expect(screen.getByText('Red Bull Racing')).toBeInTheDocument();
  });

  it('muestra "Sin equipo" si el piloto no corre esta temporada', () => {
    render(<DriverCard driver={{ ...driver, constructor: null }} onOpen={() => {}} />);

    expect(screen.getByText('Sin equipo')).toBeInTheDocument();
  });

  it('avisa el id al abrir', async () => {
    const onOpen = vi.fn();
    render(<DriverCard driver={driver} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: 'Ver piloto Max Verstappen' }));

    expect(onOpen).toHaveBeenCalledWith(7);
  });
});
