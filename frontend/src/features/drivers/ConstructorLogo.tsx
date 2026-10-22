import { useState } from 'react';
import type { ConstructorRef } from '../../models/driver';

// El fallback ocupa la misma caja para que la fila no se desalinee si falta un logo.
// 24x24 exige que el archivo sea la marca sola, no el wordmark: apaisado queda ilegible.
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
    // Sin dark:bg-white: los logos son a color con fondo transparente y se leen sobre fondo oscuro.
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
