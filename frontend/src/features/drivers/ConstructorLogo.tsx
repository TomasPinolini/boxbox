import { useState } from 'react';
import type { ConstructorRef } from '../../models/driver';

// Logo de la escuderia, servido de /public/logos (ver CREDITS.md por las licencias).
// Calcado de DriverAvatar a proposito: mismo contrato, mismo manejo de fallo.
//
// Tres de las once no tienen logo —Ferrari, Audi F1 Team y Racing Bulls— porque no habia en
// Commons un archivo usable con fondo transparente. No es un error ni un dato faltante: es
// una limitacion conocida y registrada.
//
// El fallback NO es "no dibujar nada". Un hueco haria que esas tres filas alinearan su texto
// 28px a la izquierda de las otras ocho, y la tabla se veria rota. Es un cuadrado con el
// color oficial del equipo: ocupa lo mismo y sigue identificando al equipo.
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
    <span className={BOX}>
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
