import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SelectedBadge } from '../../components/ui';
import type { Driver } from '../../models/driver';
import { ConstructorLogo } from './ConstructorLogo';

// Se reusa tal cual en TeamLineup y DraftPicker: un piloto se ve igual elegido que en el catalogo.
// El degrade hacia INK deja siempre oscuridad de sobra donde vive el texto, asi que el blanco
// fijo se lee sobre los 11 colores. INK fijo: la card no depende del tema de la app.
const INK = '#1a1a1c';

// La franja de escuderia es un <Link> hermano del <button>, no hijo: un <a> dentro de un
// <button> es HTML invalido. `disabled` apaga toda la card, franja incluida, y
// `linkToConstructor={false}` saca el link para que en el draft un click no te saque de la pantalla.
export function DriverCard({
  driver,
  onOpen,
  selected,
  disabled,
  ariaLabel,
  linkToConstructor = true,
}: {
  driver: Driver;
  onOpen: (id: number) => void;
  selected?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  linkToConstructor?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(driver.headshotUrl) && !failed;
  const color = driver.constructor?.color ?? '#64748b';
  const label = ariaLabel ?? `Ver piloto ${driver.firstName} ${driver.lastName}, número ${driver.number}`;

  return (
    <div
      className={`relative flex h-44 flex-col overflow-hidden rounded-lg shadow-sm ring-1 transition-shadow dark:ring-ink-border ${
        disabled
          ? 'pointer-events-none opacity-50 grayscale ring-slate-200'
          : selected
            ? 'ring-2 ring-red-600'
            : 'ring-slate-200 hover:shadow-md'
      }`}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(135deg, ${color} 0%, ${INK} 65%)` }}
      />

      {selected && !disabled && <SelectedBadge />}

      {/* h-[132px] fijo y no flex-1: dentro de un flex item con alto auto, el h-full del <img>
          no resuelve y la foto desborda la card en anchos grandes, tapando la franja de abajo.
          132px = h-44 (176px) menos la franja (min-h-11, 44px). */}
      <button
        type="button"
        disabled={disabled}
        aria-pressed={disabled || selected === undefined ? undefined : selected}
        // aria-label reemplaza el contenido del boton: sin el dorsal aca, el lector no lo lee.
        aria-label={disabled ? `${label} (ya elegido)` : label}
        onClick={() => onOpen(driver.id)}
        className="relative z-10 flex h-[132px] cursor-pointer items-stretch text-left disabled:cursor-not-allowed"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-4 pr-1">
          <p className="truncate text-base font-semibold text-white">
            {driver.firstName}
          </p>
          <p className="truncate text-xl font-extrabold text-white">
            {driver.lastName}
          </p>
          <p className="text-5xl font-extrabold leading-none text-white/55">
            {driver.number}
          </p>
        </div>
        <div className="flex w-2/5 shrink-0 items-end justify-center">
          {hasPhoto ? (
            <img
              src={driver.headshotUrl!}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-contain object-bottom"
            />
          ) : (
            <span aria-hidden="true" className="text-4xl font-extrabold text-white">
              {driver.firstName[0]}
              {driver.lastName[0]}
            </span>
          )}
        </div>
      </button>

      {driver.constructor ? (
        // Sin el chip blanco de TeamLineup: aca el fondo es bg-black/45, oscuro parejo, y los
        // logos se leen directo sobre el.
        linkToConstructor ? (
          <Link
            to={`/constructors/${driver.constructor.id}`}
            className="relative z-10 flex min-h-11 items-center gap-2 bg-black/45 px-3 py-1.5 hover:bg-black/60"
          >
            <ConstructorLogo constructor={driver.constructor} />
            <span className="truncate text-xs font-semibold text-white">{driver.constructor.name}</span>
          </Link>
        ) : (
          <div className="relative z-10 flex min-h-11 items-center gap-2 bg-black/45 px-3 py-1.5">
            <ConstructorLogo constructor={driver.constructor} />
            <span className="truncate text-xs font-semibold text-white">{driver.constructor.name}</span>
          </div>
        )
      ) : (
        <div className="relative z-10 flex min-h-11 items-center bg-black/45 px-3 py-1.5">
          <span className="truncate text-xs font-semibold text-white/70">Sin equipo</span>
        </div>
      )}
    </div>
  );
}
