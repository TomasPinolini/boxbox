import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpPopover } from './HelpPopover';
import { PageShell } from './PageShell';

describe('PageShell', () => {
  // Mira la estructura y no el nombre accesible: el nombre del <h1> no cambia con el "?"
  // adentro, asi que esa asercion pasaria igual.
  it('el titleHelp queda al lado del <h1>, no adentro', () => {
    render(
      <PageShell
        title="Mis ligas"
        titleHelp={<HelpPopover title="¿Qué es una liga?">Un grupo privado.</HelpPopover>}
      >
        <p>contenido</p>
      </PageShell>,
    );

    const h1 = screen.getByRole('heading', { level: 1, name: 'Mis ligas' });
    expect(h1.querySelector('button')).toBeNull();
    expect(screen.getByRole('button', { name: '¿Qué es una liga?' })).toBeInTheDocument();
  });

  it('sin titleHelp el encabezado es sólo el título', () => {
    render(
      <PageShell title="Pilotos">
        <p>contenido</p>
      </PageShell>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Pilotos' })).toBeInTheDocument();
  });
});
