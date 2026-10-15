import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TOUR_STEPS } from './tour-steps';
import { WelcomeTour } from './WelcomeTour';

describe('WelcomeTour', () => {
  it('arranca en el primer paso', () => {
    render(<WelcomeTour onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: TOUR_STEPS[0].title })).toBeInTheDocument();
    expect(screen.getByText(`PASO 1 DE ${TOUR_STEPS.length}`)).toBeInTheDocument();
  });

  it('avanza paso a paso hasta el último, donde el botón cambia de nombre', async () => {
    const user = userEvent.setup();
    render(<WelcomeTour onClose={vi.fn()} />);

    for (let i = 1; i < TOUR_STEPS.length; i++) {
      await user.click(screen.getByRole('button', { name: 'Siguiente' }));
      expect(screen.getByRole('heading', { name: TOUR_STEPS[i].title })).toBeInTheDocument();
    }

    // En el último no hay "Siguiente" ni "Saltear": no queda nada que saltear.
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Saltear' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeInTheDocument();
  });

  it('cierra con Saltear, con Empezar y con Escape', async () => {
    const user = userEvent.setup();

    const saltear = vi.fn();
    const { unmount } = render(<WelcomeTour onClose={saltear} />);
    await user.click(screen.getByRole('button', { name: 'Saltear' }));
    expect(saltear).toHaveBeenCalledOnce();
    unmount();

    const escape = vi.fn();
    const segundo = render(<WelcomeTour onClose={escape} />);
    await user.keyboard('{Escape}');
    expect(escape).toHaveBeenCalledOnce();
    segundo.unmount();

    const empezar = vi.fn();
    render(<WelcomeTour onClose={empezar} />);
    for (let i = 1; i < TOUR_STEPS.length; i++) {
      await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    }
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    expect(empezar).toHaveBeenCalledOnce();
  });

  it('devuelve el scroll del body al desmontarse', () => {
    const { unmount } = render(<WelcomeTour onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
