import { Badge, Card } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import type { LeagueListItem } from '../../models/league';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { DRAFT_LABEL } from './draft-label';

// La tarjeta entera es el boton (stretched link), como DriverCard.
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

  const equipo = league.myTeam;
  const misPilotos = [equipo?.driver1Id, equipo?.driver2Id]
    .map((driverId) => drivers.find((d) => d.id === driverId))
    .filter((d): d is Driver => d !== undefined);
  const miEscuderia = constructors.find((c) => c.id === equipo?.constructorId) ?? null;
  // Antes del draft el FantasyTeam existe con los slots vacios: no se dibuja nada.
  const hayEquipo = misPilotos.length > 0 || miEscuderia !== null;

  return (
    <Card className="relative transition-shadow hover:shadow-md">
      {/* El badge va abajo: al lado de "DRAFT PENDIENTE" un nombre corto se truncaba igual. */}
      <div className="flex items-start gap-2">
        {/* Sin min-w-0 un item de flex no se encoge bajo su contenido y truncate no actua. */}
        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{league.name}</h2>
        <span aria-hidden="true" className="shrink-0 font-semibold text-red-600">
          →
        </span>
      </div>
      {/* El codigo NO se trunca: es para leerlo y tipearlo entero. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-ink-muted">
        <span>
          Código: <span className="font-mono">{league.inviteCode}</span>
        </span>
        <Badge tone={draft.tone}>{draft.text}</Badge>
      </div>

      {hayEquipo && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3 dark:border-ink-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-muted">
            Tu equipo
          </span>
          {misPilotos.map((d) => (
            <span
              key={d.id}
              className="flex items-center gap-1.5 text-sm"
              title={`${d.firstName} ${d.lastName}`}
            >
              <DriverAvatar driver={d} size={24} />
              {/* El title solo sirve al mouse: el nombre para el lector va en sr-only y el
                  codigo se oculta para no oir "Max Verstappen VER". */}
              <span className="sr-only">
                {d.firstName} {d.lastName}
              </span>
              <span
                aria-hidden="true"
                className="font-display tabular-nums text-slate-600 dark:text-ink-muted"
              >
                {d.code}
              </span>
            </span>
          ))}
          {miEscuderia && (
            <span className="flex items-center gap-1.5 text-sm" title={miEscuderia.name}>
              <ConstructorLogo constructor={miEscuderia} />
              <span className="text-slate-600 dark:text-ink-muted">{miEscuderia.name}</span>
            </span>
          )}
        </div>
      )}

      {/* aria-label con el nombre: sin el, todas las tarjetas suenan igual. */}
      <button
        type="button"
        aria-label={`Ver liga ${league.name}`}
        className="absolute inset-0 cursor-pointer rounded-lg"
        onClick={() => onOpen(league.id)}
      />
    </Card>
  );
}
