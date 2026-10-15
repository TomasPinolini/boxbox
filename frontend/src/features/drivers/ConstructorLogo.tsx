import { useState } from 'react';
import type { ConstructorRef } from '../../models/driver';

// Logo de la escuderia, servido de /public/logos (ver CREDITS.md por las licencias).
// Calcado de DriverAvatar a proposito: mismo contrato, mismo manejo de fallo.
//
// Las 11 escuderias tienen logo. El fallback (logoUrl null, o la imagen rota) sigue existiendo
// por las dudas — un hueco haria que esa fila alineara su texto 28px a la izquierda de las
// demas, y la tabla se veria rota — pero hoy no deberia disparar para ninguna.
// Caja cuadrada de 24px. Depende de que el archivo sea la MARCA sola (el speedmark de
// McLaren, la estrella de Mercedes, la "A" de Alpine) y no el wordmark con el nombre
// adentro: un logo apaisado encerrado en 24x24 queda ilegible. Ver CREDITS.md.
const BOX = 'inline-flex h-6 w-6 shrink-0 items-center justify-center';

export function ConstructorLogo({ constructor }: { constructor: ConstructorRef }) {
  const [failed, setFailed] = useState(false);

  if (!constructor.logoUrl || failed) {
    return (
      <span className={BOX} aria-hidden="true">
        <span className="h-6 w-6 rounded" style={{ backgroundColor: constructor.color }} />
      </span>
    );
  }

  return (
    // dark:bg-white: los archivos de /public/logos estan pensados para fondo claro (ver
    // CREDITS.md) — varios tienen trazos oscuros que se perderian sobre una superficie
    // oscura. Un solo arreglo aca en vez de en cada pantalla que usa este componente (son
    // siete, de LeagueCard a DraftPicker); donde el que llama ya envuelve esto en su propio
    // chip circular blanco (DriverCard, TeamLineup) esto queda blanco sobre blanco, sin
    // cambiar nada.
    <span className={`${BOX} dark:rounded dark:bg-white`}>
      <img
        src={constructor.logoUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
        className="max-h-6 max-w-full object-contain object-left"
      />
    </span>
  );
}
