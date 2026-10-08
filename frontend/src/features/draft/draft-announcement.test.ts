import { draftAnnouncement } from './draft-announcement';

const base = {
  draftStatus: 'LIVE' as const,
  round: 2,
  isMyTurn: false,
  currentTurnName: 'Tomás Rivero',
  lastPick: null,
};

describe('draftAnnouncement', () => {
  it('dice la ronda y de quien es el turno', () => {
    expect(draftAnnouncement(base)).toBe('Ronda 2 de 3. Le toca a Tomás Rivero.');
  });

  it('cuando es tu turno lo dice en segunda persona, sin nombrarte', () => {
    expect(draftAnnouncement({ ...base, isMyTurn: true })).toBe('Ronda 2 de 3. Te toca a vos.');
  });

  it('anuncia el ultimo pick antes del turno nuevo', () => {
    const texto = draftAnnouncement({
      ...base,
      lastPick: { memberName: 'Pinolini', label: 'Lando Norris' },
    });
    expect(texto).toBe('Pinolini eligió Lando Norris. Ronda 2 de 3. Le toca a Tomás Rivero.');
  });

  it('avisa cuando el draft termino', () => {
    expect(draftAnnouncement({ ...base, draftStatus: 'COMPLETED' })).toBe(
      'El draft terminó. Los equipos quedaron armados.',
    );
  });

  // Nada que anunciar es string vacio y no una frase: un aria-live con texto fijo se
  // re-anunciaria en cada render.
  it('calla cuando el draft todavia no arranco', () => {
    expect(draftAnnouncement({ ...base, draftStatus: 'PENDING' })).toBe('');
    expect(draftAnnouncement({ ...base, round: null })).toBe('');
  });
});
