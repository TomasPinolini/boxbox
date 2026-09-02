import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, PageShell } from '../../components/ui';
import { useAuthStore } from '../../store/auth.store';
import { DRAFT_LABEL } from './draft-label';
import { MembersTable } from './MembersTable';
import { useKick, useLeague, useLeave, useMembers, useStartDraft } from './leagues.queries';

export function LeagueDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const league = useLeague(id);
  const members = useMembers(id);
  const startDraft = useStartDraft(id);
  const leave = useLeave(id);
  const kick = useKick(id);
  const [copied, setCopied] = useState(false);

  if (league.error) {
    return (
      <PageShell title="Liga">
        <Alert code={league.error.code} message={league.error.message} />
      </PageShell>
    );
  }
  if (!league.data) return <p className="p-6 text-slate-500">Cargando…</p>;

  const l = league.data;
  const isOwner = l.createdById === me?.id;
  const rosterOpen = l.draftStatus === 'PENDING';
  const draft = DRAFT_LABEL[l.draftStatus];
  const busy = startDraft.isPending || leave.isPending || kick.isPending;
  const actionError = startDraft.error ?? leave.error ?? kick.error ?? members.error;

  async function copyCode() {
    await navigator.clipboard.writeText(l.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <PageShell
      title={l.name}
      actions={
        <Link to="/leagues" className="text-sm font-semibold text-slate-600 hover:underline">
          ← Mis ligas
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Miembros ({members.data?.length ?? 0}/{l.maxMembers})
            </h2>
            <Badge tone={draft.tone}>{draft.text}</Badge>
          </div>
          {actionError && (
            <div className="mb-3">
              <Alert code={actionError.code} message={actionError.message} />
            </div>
          )}
          <MembersTable
            members={members.data ?? []}
            canKick={isOwner && rosterOpen}
            onKick={(userId) => kick.mutate(userId)}
          />
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Invitar</h2>
            <p className="text-sm text-slate-600">Compartí este código:</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 font-mono">{l.inviteCode}</code>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 text-lg font-semibold">Draft</h2>
            {isOwner ? (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  Cuando estén todos, arrancá el draft. Después no entra ni sale nadie.
                </p>
                <Button disabled={!rosterOpen || busy} onClick={() => startDraft.mutate()}>
                  {rosterOpen ? 'Iniciar draft' : draft.text}
                </Button>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  Solo el owner puede arrancar el draft.
                </p>
                <Button
                  variant="danger"
                  disabled={!rosterOpen || busy}
                  onClick={() => leave.mutate(undefined, { onSuccess: () => navigate('/leagues') })}
                >
                  Salir de la liga
                </Button>
              </>
            )}
          </Card>
        </aside>
      </div>
    </PageShell>
  );
}
