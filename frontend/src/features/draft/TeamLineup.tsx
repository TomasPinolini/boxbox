import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectedBadge } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { DriverCard } from '../drivers/DriverCard';
import { teamMarkUrl } from '../drivers/team-marks';
import { textOn } from '../drivers/team-color';

// Reciben pilotos y escuderia ya resueltos, no ids: los lookups contra las queries quedan en la pagina.

// Con `onSelect` se dibuja como <button> y no como <Link>: un <a> dentro de otro elemento
// interactivo no es HTML valido, por eso son dos ramas de render.
export function ConstructorStrip({
  constructor,
  onSelect,
  selected,
  disabled,
  ariaLabel,
}: {
  constructor: ConstructorRef;
  onSelect?: (id: number) => void;
  selected?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [markFailed, setMarkFailed] = useState(false);
  const fg = textOn(constructor.color);
  const markUrl = teamMarkUrl(constructor.name);
  const showBleed = Boolean(markUrl) && !markFailed;
  const label = ariaLabel ?? constructor.name;

  const className = `relative flex min-h-16 items-center gap-2.5 overflow-hidden rounded-md px-3 py-2.5 text-left transition ${
    disabled
      ? 'pointer-events-none opacity-50 grayscale'
      : selected
        ? 'ring-2 ring-red-600'
        : ''
  }`;

  const content = (
    <>
      {selected && !disabled && <SelectedBadge />}
      {showBleed && (
        <img
          src={markUrl!}
          alt=""
          aria-hidden="true"
          onError={() => setMarkFailed(true)}
          className="pointer-events-none absolute right-[-14px] top-1/2 h-[120px] w-[120px] -translate-y-1/2 object-contain opacity-25"
        />
      )}
      <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90">
        <ConstructorLogo constructor={constructor} />
      </span>
      <div className="relative z-10 min-w-0">
        <p className="truncate text-lg font-extrabold" style={{ color: fg }}>
          {constructor.name}
        </p>
        <p className="text-xs opacity-80" style={{ color: fg }}>
          Escudería
        </p>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-pressed={disabled ? undefined : selected}
        aria-label={disabled ? `${label} (ya elegido)` : label}
        onClick={() => onSelect(constructor.id)}
        className={`w-full cursor-pointer ${className}`}
        style={{ backgroundColor: constructor.color }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={`/constructors/${constructor.id}`} className={className} style={{ backgroundColor: constructor.color }}>
      {content}
    </Link>
  );
}

export function TeamLineup({
  drivers,
  constructor,
  onOpenDriver,
}: {
  drivers: Driver[];
  constructor: ConstructorRef | null;
  onOpenDriver: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {constructor && <ConstructorStrip constructor={constructor} />}
      <div className="grid grid-cols-2 gap-3">
        {drivers.map((d) => (
          <DriverCard key={d.id} driver={d} onOpen={onOpenDriver} />
        ))}
      </div>
    </div>
  );
}

// Apellidos y no codigos de tres letras: "VER - HAM" obliga a traducir.
export function TeamRow({
  memberName,
  drivers,
  constructor,
}: {
  memberName: string;
  drivers: Driver[];
  constructor: ConstructorRef | null;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span className="min-w-32 font-semibold">{memberName}</span>
      <span className="flex items-center gap-2">
        {drivers.map((d) => (
          <span key={d.id} className="flex items-center gap-1.5 text-sm">
            <DriverAvatar driver={d} size={24} />
            {d.lastName}
          </span>
        ))}
      </span>
      {constructor && (
        <span className="flex items-center gap-1.5">
          <ConstructorLogo constructor={constructor} />
          <span className="text-sm text-slate-500 dark:text-ink-muted">{constructor.name}</span>
        </span>
      )}
    </li>
  );
}
