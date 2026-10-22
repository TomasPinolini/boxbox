import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ConstructorRef, Driver } from '../../models/driver';
import { DraftPicker } from './DraftPicker';

// Necesita Router: DriverCard y ConstructorStrip dibujan un <Link> a /constructors/:id.
function renderPicker(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

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
    renderPicker(
      <DraftPicker
        category="DRIVER"
        drivers={drivers}
        constructors={[]}
        takenIds={new Set()}
        selectedId={null}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /Max Verstappen/ })).toBeInTheDocument();
    // DriverCard dibuja el dorsal sin "#".
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Red Bull Racing')).toBeInTheDocument();
  });

  it('avisa el id del piloto elegido', async () => {
    const onSelect = vi.fn();
    renderPicker(
      <DraftPicker
        category="DRIVER"
        drivers={drivers}
        constructors={[]}
        takenIds={new Set()}
        selectedId={null}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Charles Leclerc/ }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('marca con aria-pressed la opcion seleccionada', () => {
    renderPicker(
      <DraftPicker
        category="DRIVER"
        drivers={drivers}
        constructors={[]}
        takenIds={new Set()}
        selectedId={1}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /Max Verstappen/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Charles Leclerc/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('en categoria CONSTRUCTOR lista escuderias, no pilotos', () => {
    renderPicker(
      <DraftPicker
        category="CONSTRUCTOR"
        drivers={drivers}
        constructors={[redBull, ferrari]}
        takenIds={new Set()}
        selectedId={null}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Red Bull Racing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ferrari' })).toBeInTheDocument();
    expect(screen.queryByText('Max Verstappen')).not.toBeInTheDocument();
  });

  // El elegido se apaga y no se va: si desapareciera, su companero se reacomodaria al lado de
  // otro equipo.
  describe('pilotos ya elegidos (takenIds)', () => {
    it('siguen en la lista, pero deshabilitados y sin aria-pressed', () => {
      renderPicker(
        <DraftPicker
          category="DRIVER"
          drivers={drivers}
          constructors={[]}
          takenIds={new Set([1])}
          selectedId={null}
          onSelect={() => {}}
        />,
      );

      const taken = screen.getByRole('button', { name: /Max Verstappen.*ya elegido/ });
      expect(taken).toBeDisabled();
      expect(taken).not.toHaveAttribute('aria-pressed');

      const free = screen.getByRole('button', { name: /Charles Leclerc/ });
      expect(free).toBeEnabled();
    });

    it('no se pueden clickear', async () => {
      const onSelect = vi.fn();
      renderPicker(
        <DraftPicker
          category="DRIVER"
          drivers={drivers}
          constructors={[]}
          takenIds={new Set([1])}
          selectedId={null}
          onSelect={onSelect}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /Max Verstappen.*ya elegido/ }));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('tambien aplica a escuderias en categoria CONSTRUCTOR', () => {
      renderPicker(
        <DraftPicker
          category="CONSTRUCTOR"
          drivers={[]}
          constructors={[redBull, ferrari]}
          takenIds={new Set([3])}
          selectedId={null}
          onSelect={() => {}}
        />,
      );

      expect(screen.getByRole('button', { name: 'Red Bull Racing (ya elegido)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Ferrari' })).toBeEnabled();
    });
  });
});
