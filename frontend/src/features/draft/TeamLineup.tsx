import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectedBadge } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { DriverCard } from '../drivers/DriverCard';
import { teamMarkUrl } from '../drivers/team-marks';
import { textOn } from '../drivers/team-color';

// Las dos formas de mostrar un equipo armado: el bloque grande del dueno de la pantalla y la
// fila compacta de los demas. Viven juntas porque son la misma idea a dos escalas, y fuera de
// DraftPage porque LeagueDetailPage tambien las necesita.
//
// Reusan DriverCard / DriverAvatar / TeamBadge / ConstructorLogo a proposito: el piloto que
// elegiste tiene que verse igual que en /drivers. Si esta pantalla dibujara su propia version
// del piloto, serian dos verdades del mismo dato y se irian separando.
//
// Reciben pilotos y escuderia YA RESUELTOS, no ids: los lookups contra las queries quedan en
// la pagina, igual que en draft-announcement.ts y buildDraftTeams. Lo mismo con onOpenDriver:
// TeamLineup no navega por su cuenta, la pagina decide que hacer con el id.

// Franja compacta de la escuderia, arriba de las dos driver cards — pedido del usuario
// 2026-10-14: antes era una tarjeta mas, al mismo nivel que cada piloto, y asi se perdia que
// es UNA eleccion distinta (acompaña a los dos, no es un tercer piloto).
//
// Sin textura de fondo — se probo un patron de lineas de circuito y no convencio (pedido del
// usuario 2026-10-14). Color solido del equipo, el emblema sangrando del borde derecho es
// suficiente guiño visual. El emblema viene de `teamMarkUrl`, no de `logoUrl` (ver ese
// archivo: son monocromos, piensan para el color del equipo, no para el chip blanco).
// onSelect/selected/disabled/ariaLabel son para el DraftPicker (Slice 17): la escudería por
// la que estás eligiendo se ve exactamente igual que la ya elegida en "Tu equipo" — mismo
// criterio que el `selected`/`disabled` que se sumó a DriverCard. Sin `onSelect` se comporta
// exactamente como antes (un <Link> a /constructors/:id); con `onSelect` se dibuja como
// <button> en vez de <Link> — un <a> dentro de otro elemento interactivo no es valido HTML,
// así que son dos ramas de render, no un wrapper condicional.
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
        {/* La tipografia ya es la general (Montserrat, --font-sans), se hereda sola — ver el
            comentario en DriverCard.tsx. font-extrabold si hace falta explicito. */}
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
      {/* Los dos pilotos al mismo tamano, uno al lado del otro siempre — son exactamente dos,
          nunca mas ni menos (ADR-0006), asi que no hace falta una grilla que calcule columnas. */}
      <div className="grid grid-cols-2 gap-3">
        {drivers.map((d) => (
          <DriverCard key={d.id} driver={d} onOpen={onOpenDriver} />
        ))}
      </div>
    </div>
  );
}

// La version de una linea, para la lista de los otros jugadores. Apellidos y no codigos de
// tres letras: "VER - HAM" obliga a traducir, "Verstappen - Hamilton" se lee.
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
