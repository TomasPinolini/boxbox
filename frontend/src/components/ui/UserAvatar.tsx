import { useState } from 'react';
import type { User } from '../../models/user';

// Foto del usuario + iniciales de respaldo, mismo patron que DriverAvatar (features/drivers/):
// avatarUrl es un recurso remoto que puede fallar, y bastantes usuarios ni lo van a tener.
//
// Vive en components/ui/ y no en app/AppLayout.tsx (donde nació, Slice de drawer mobile)
// porque EditProfileModal.tsx (features/profile/) también lo necesita — un componente sin
// lógica de dominio usado desde dos lugares es exactamente lo que esta carpeta es para.
export function UserAvatar({ user, size = 44 }: { user: Pick<User, 'name' | 'avatarUrl'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (!user.avatarUrl || failed) {
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
      src={user.avatarUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-slate-100 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
