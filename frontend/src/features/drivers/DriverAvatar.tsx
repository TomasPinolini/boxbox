import { useState } from 'react';
import type { Driver } from '../../models/driver';

// Pick y no Driver entero: el campeonato pasa un piloto sin `number`.
type AvatarDriver = Pick<Driver, 'firstName' | 'lastName' | 'headshotUrl'>;

export function DriverAvatar({ driver, size = 48 }: { driver: AvatarDriver; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = `${driver.firstName[0] ?? ''}${driver.lastName[0] ?? ''}`;

  if (!driver.headshotUrl || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-ink-surface dark:text-ink-muted"
        style={{ width: size, height: size, fontSize: Math.max(size * 0.36, 10) }}
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
      className="shrink-0 rounded-full bg-slate-100 object-cover dark:bg-ink-surface"
      style={{ width: size, height: size }}
    />
  );
}
