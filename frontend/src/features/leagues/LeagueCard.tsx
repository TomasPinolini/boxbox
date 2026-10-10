import { Badge, Card } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import type { LeagueListItem } from '../../models/league';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { DRAFT_LABEL } from './draft-label';

// LeagueCard: una liga en la lista. Entrada: la liga. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo patron que DriverCard, ahora de verdad: la tarjeta
// entera es el boton (stretched link), el nombre se trunca, y el "Ver liga ->" que ocupaba una
// linea propia con 20px de area tactil desaparecio.
export function LeagueCard({
  league,
  drivers,
  constructors,
  onOpen,
}: {
  league: LeagueListItem;
  drivers: Driver[];
  constructors: ConstructorRef[];
  onOpen: (id: number) => void;
}) {
  const draft = DRAFT_LABEL[league.draftStatus];

  // Los lookups viven en el componente y no en la pagina porque son del render de ESTA
  // tarjeta: el backend manda ids, el catalogo de pilotos ya esta en cache para toda la
  // pantalla, y resolverlo aca evita que la pagina arme un objeto por liga.
  const equipo = league.myTeam;
  const misPilotos = [equipo?.driver1Id, equipo?.driver2Id]
    .map((driverId) => drivers.find((d) => d.id === driverId))
    .filter((d): d is Driver => d !== undefined);
  const miEscuderia = constructors.find((c) => c.id === equipo?.constructorId) ?? null;
  // Sin pilotos ni escuderia no se dibuja nada: antes del draft el FantasyTeam existe con
  // los slots vacios, y una fila de guiones no comunica nada.
  const hayEquipo = misPilotos.length > 0 || miEscuderia !== null;

  return (
    <Card className="relative transition-shadow hover:shadow-md">
      {/* El nombre va solo en su linea, con el badge abajo. Compartiendo linea con un badge
          ancho como "DRAFT PENDIENTE", un nombre corto se truncaba sobrando lugar. */}
      <div className="flex items-start gap-2">
        {/* min-w-0 es lo que hace funcionar al truncate: sin el, un item de flex no se encoge
            por debajo del ancho de su contenido y el nombre largo desborda la tarjeta. */}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{league.name}</h2>
        <span aria-hidden="true" className="shrink-0 font-semibold text-red-600">
          →
        </span>
      </div>
      {/* El codigo NO se trunca: es para leerlo y tipearlo entero. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
        <span>
          Código: <span className="font-mono">{league.inviteCode}</span>
        </span>
        <Badge tone={draft.tone}>{draft.text}</Badge>
      </div>

      {hayEquipo && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tu equipo
          </span>
          {misPilotos.map((d) => (
            <span
              key={d.id}
              className="flex items-center gap-1.5 text-sm"
              title={`${d.firstName} ${d.lastName}`}
            >
              <DriverAvatar driver={d} size={24} />
              <span className="font-display tabular-nums text-slate-600">{d.code}</span>
            </span>
          ))}
          {miEscuderia && (
            <span className="flex items-center gap-1.5 text-sm" title={miEscuderia.name}>
              <ConstructorLogo constructor={miEscuderia} />
              <span className="text-slate-600">{miEscuderia.name}</span>
            </span>
          )}
        </div>
      )}

      {/* aria-label con el nombre: el nombre accesible tiene que distinguir esta liga de las
          otras. Sin el, todas las tarjetas suenan igual fuera de contexto. */}
      <button
        type="button"
        aria-label={`Ver liga ${league.name}`}
        className="absolute inset-0 cursor-pointer rounded-lg"
        onClick={() => onOpen(league.id)}
      />
    </Card>
  );
}
