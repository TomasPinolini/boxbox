import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConstructorRef, Driver } from '../../models/driver';
import { DraftPicker } from './DraftPicker';

const redBull: ConstructorRef = { id: 3, name: 'Red Bull Racing', color: '#3671C6', logoUrl: null };
const ferrari: ConstructorRef = { id: 5, name: 'Ferrari', color: '#E8002D', logoUrl: null };

const drivers: Driver[] = [
  {
    id: 1,
    firstName: 'Max',
    lastName: 'Verstappen',
    number: 1,
    code: 'VER',
    headshotUrl: null,
    constructor: redBull,
  },
  {
    id: 2,
    firstName: 'Charles',
    lastName: 'Leclerc',
    number: 16,
    code: 'LEC',
    headshotUrl: null,
    constructor: ferrari,
  },
];

describe('DraftPicker', () => {
  it('lista los pilotos con numero y escudería', () => {
    render(
      <DraftPicker
        category="DRIVER"
        drivers={drivers}
        constructors={[]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Max Verstappen' })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Red Bull Racing')).toBeInTheDocument();
  });

  it('avisa el id del piloto elegido', async () => {
    const onSelect = vi.fn();
    render(
      <DraftPicker
        category="DRIVER"
        drivers={drivers}
        constructors={[]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Charles Leclerc' }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('marca con aria-pressed la opcion seleccionada', () => {
    render(
      <DraftPicker
        category="DRIVER"
        drivers={drivers}
        constructors={[]}
        selectedId={1}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Max Verstappen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Charles Leclerc' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('en categoria CONSTRUCTOR lista escuderias, no pilotos', () => {
    render(
      <DraftPicker
        category="CONSTRUCTOR"
        drivers={drivers}
        constructors={[redBull, ferrari]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Red Bull Racing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ferrari' })).toBeInTheDocument();
    expect(screen.queryByText('Max Verstappen')).not.toBeInTheDocument();
  });
});
