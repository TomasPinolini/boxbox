import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConstructorRef } from '../../models/driver';
import { ConstructorFilter } from './ConstructorFilter';

const constructors: ConstructorRef[] = [
  { id: 3, name: 'Red Bull Racing', color: '#3671C6', logoUrl: null },
  { id: 5, name: 'Ferrari', color: '#E8002D', logoUrl: null },
];

describe('ConstructorFilter', () => {
  it('lista las escuderias mas la opcion Todas', () => {
    render(<ConstructorFilter constructors={constructors} value={null} onChange={() => {}} />);

    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Todas' })).toBeInTheDocument();
  });

  it('avisa el id de la escuderia elegida', async () => {
    const onChange = vi.fn();
    render(<ConstructorFilter constructors={constructors} value={null} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), '5');

    expect(onChange).toHaveBeenCalledWith(5);
  });

  // Volver a "Todas" tiene que limpiar el filtro, no mandar 0 ni NaN.
  it('avisa null al volver a Todas', async () => {
    const onChange = vi.fn();
    render(<ConstructorFilter constructors={constructors} value={5} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), '');

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
