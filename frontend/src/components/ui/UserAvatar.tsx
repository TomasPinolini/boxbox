import { useState } from 'react';
import type { User } from '../../models/user';

// Iniciales de respaldo: avatarUrl es remoto, puede fallar o no existir.
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
