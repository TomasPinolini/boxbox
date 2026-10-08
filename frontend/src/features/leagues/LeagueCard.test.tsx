import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { League } from '../../models/league';
import { LeagueCard } from './LeagueCard';

const league: League = {
  id: 7,
  name: 'Liga UTN',
  inviteCode: 'utn-2026',
  maxMembers: 11,
  seasonId: 1,
  createdById: 1,
  draftStatus: 'PENDING',
  status: 'ACTIVE',
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
};

describe('LeagueCard', () => {
  it('muestra nombre, codigo y estado del draft', () => {
    render(<LeagueCard league={league} onOpen={() => {}} />);
    expect(screen.getByText('Liga UTN')).toBeInTheDocument();
    expect(screen.getByText('utn-2026')).toBeInTheDocument();
    expect(screen.getByText('Draft pendiente')).toBeInTheDocument();
  });

  it('llama onOpen con el id al hacer click', async () => {
    const onOpen = vi.fn();
    render(<LeagueCard league={league} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /ver liga/i }));
    expect(onOpen).toHaveBeenCalledWith(7);
  });

  // El nombre accesible tiene que distinguir esta tarjeta de las otras: con varias ligas en
  // pantalla, "Ver liga" repetido no le dice nada a un lector de pantalla.
  it('el boton nombra la liga en su aria-label', () => {
    render(<LeagueCard league={league} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'Ver liga Liga UTN' })).toBeInTheDocument();
  });
});
