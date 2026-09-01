import { Badge, Card } from '../../components/ui';
import type { League } from '../../models/league';
import { DRAFT_LABEL } from './draft-label';

// LeagueCard: una liga en la lista. Entrada: la liga. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina.
export function LeagueCard({ league, onOpen }: { league: League; onOpen: (id: number) => void }) {
  const draft = DRAFT_LABEL[league.draftStatus];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{league.name}</h2>
          <p className="text-sm text-slate-500">
            Código: <span className="font-mono">{league.inviteCode}</span>
          </p>
        </div>
        <Badge tone={draft.tone}>{draft.text}</Badge>
      </div>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-red-600 hover:underline"
        onClick={() => onOpen(league.id)}
      >
        Ver liga →
      </button>
    </Card>
  );
}
