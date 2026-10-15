import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpPopover } from './HelpPopover';
import { PageShell } from './PageShell';

describe('PageShell', () => {
  // La razón de ser de titleHelp: el "?" tiene que quedar AL LADO del <h1>, nunca adentro.
  // HelpPopover tiene un <div> en la raíz, y un <div> dentro de un <h1> es HTML inválido —
  // el <h1> sólo admite contenido de frase.
  //
  // La aserción mira la ESTRUCTURA y no el nombre accesible a propósito: el nombre accesible
  // del encabezado resultó NO verse afectado (medido), así que una aserción sobre el nombre
  // pasaba igual con el "?" adentro y no probaba nada.
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
    // Y sigue existiendo, al lado: no es que se perdió por el camino.
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
