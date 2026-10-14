import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { DriverCard } from '../drivers/DriverCard';
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
      {/* La escuderia arriba, como una barra de ancho completo con su color — pedido del
          usuario 2026-10-14: antes era una tarjeta mas, al mismo nivel que cada piloto, y asi
          se perdia que es UNA eleccion distinta (acompaña a los dos, no es un tercer piloto). */}
      {constructor && (
        <div
          className="flex items-center gap-2.5 rounded-md p-3"
          style={{ backgroundColor: constructor.color }}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90">
            <ConstructorLogo constructor={constructor} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold" style={{ color: textOn(constructor.color) }}>
              {constructor.name}
            </p>
            <p className="text-xs opacity-80" style={{ color: textOn(constructor.color) }}>
              Escudería
            </p>
          </div>
        </div>
      )}
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
          <span className="text-sm text-slate-500">{constructor.name}</span>
        </span>
      )}
    </li>
  );
}
