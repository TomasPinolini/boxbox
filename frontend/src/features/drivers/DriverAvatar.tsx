import { useState } from 'react';
import type { Driver } from '../../models/driver';

// Foto del piloto, contra el CDN de F1 (ver Driver.headshotUrl). Puede fallar: es un recurso
// remoto que no controlamos. Por eso el fallback a las iniciales, que ademas cubre a los
// pilotos que la API externa todavia no tiene.
export function DriverAvatar({ driver, size = 48 }: { driver: Driver; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = `${driver.firstName[0] ?? ''}${driver.lastName[0] ?? ''}`;

  if (!driver.headshotUrl || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={driver.headshotUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-slate-100 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
