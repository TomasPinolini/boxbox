import { Badge, Card } from '../../components/ui';
import type { League } from '../../models/league';
import { DRAFT_LABEL } from './draft-label';

// LeagueCard: una liga en la lista. Entrada: la liga. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo patron que DriverCard, ahora de verdad: la tarjeta
// entera es el boton (stretched link), el nombre se trunca, y el "Ver liga ->" que ocupaba una
// linea propia con 20px de area tactil desaparecio.
export function LeagueCard({ league, onOpen }: { league: League; onOpen: (id: number) => void }) {
  const draft = DRAFT_LABEL[league.draftStatus];
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
