import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { TeamBadge } from '../drivers/TeamBadge';

// Las dos formas de mostrar un equipo armado: el bloque grande del dueno de la pantalla y la
// fila compacta de los demas. Viven juntas porque son la misma idea a dos escalas, y fuera de
// DraftPage porque LeagueDetailPage tambien las necesita.
//
// Reusan DriverAvatar / TeamBadge / ConstructorLogo a proposito: el piloto que elegiste tiene
// que verse igual que en /drivers. Si esta pantalla dibujara su propia version del piloto,
// serian dos verdades del mismo dato y se irian separando.
//
// Reciben pilotos y escuderia YA RESUELTOS, no ids: los lookups contra las queries quedan en
// la pagina, igual que en draft-announcement.ts y buildDraftTeams.

// Un piloto del equipo. La franja de color al borde izquierdo es la misma de DriverCard —el
// patron de los timing screens— y cae al mismo gris neutro cuando el piloto no tiene
// escuderia en la temporada, para que las dos tarjetas midan igual.
function DriverSlot({ driver }: { driver: Driver }) {
  return (
    <div
      className="flex items-center gap-3 rounded-md border-l-4 bg-slate-50 p-3"
      style={{ borderLeftColor: driver.constructor?.color ?? '#e2e8f0' }}
    >
      <DriverAvatar driver={driver} size={56} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {driver.firstName} {driver.lastName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <span className="font-display tabular-nums">#{driver.number}</span>
          <TeamBadge constructor={driver.constructor} />
        </div>
      </div>
    </div>
  );
}

export function TeamLineup({
  drivers,
  constructor,
}: {
  drivers: Driver[];
  constructor: ConstructorRef | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Los dos pilotos al mismo tamano: el orden de pick no los jerarquiza, son las dos
          mitades de lo mismo. Apilados en telefono. */}
      <div className="grid gap-3 sm:grid-cols-2">
        {drivers.map((d) => (
          <DriverSlot key={d.id} driver={d} />
        ))}
      </div>
      {constructor && (
        <div
          className="flex items-center gap-3 rounded-md border-l-4 bg-slate-50 p-3"
          style={{ borderLeftColor: constructor.color }}
        >
          <ConstructorLogo constructor={constructor} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{constructor.name}</p>
            <p className="mt-1 text-sm text-slate-500">Escudería</p>
          </div>
        </div>
      )}
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
          <span className="text-sm text-slate-500">{constructor.name}</span>
        </span>
      )}
    </li>
  );
}
