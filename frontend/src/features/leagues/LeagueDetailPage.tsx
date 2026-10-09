import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, ConfirmButton, PageShell } from '../../components/ui';
import type { ConstructorRef, Driver } from '../../models/driver';
import type { DraftStatus } from '../../models/league';
import { useAuthStore } from '../../store/auth.store';
import { buildDraftTeams, type DraftTeam } from '../draft/draft-teams';
import { TeamLineup } from '../draft/TeamLineup';
import { useConstructors, useDrivers } from '../drivers/drivers.queries';
import { DRAFT_LABEL } from './draft-label';
import { LeagueTeamsTable, type TeamRowData } from './LeagueTeamsTable';
import { MembersTable } from './MembersTable';
import {
  useArchiveLeague,
  useKick,
  useLeague,
  useLeagueTeams,
  useLeave,
  useMembers,
  useStandings,
  useStartDraft,
} from './leagues.queries';

// La pantalla de la liga tiene TRES formas, no una con partes que se encienden y apagan.
// Antes y despues del draft el usuario viene a preguntar cosas distintas —"¿quiénes somos y
// cuántos faltan?" contra "¿cómo voy contra ellos?"— y una sola composicion que intenta las
// dos termina mala para las dos. Es tambien de donde salia el defecto mas visible de la
// pantalla vieja: "Posiciones" primera y vacia, arriba de todo, durante semanas.

export function LeagueDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const league = useLeague(id);
  const members = useMembers(id);
  const standings = useStandings(id);
  const startDraft = useStartDraft(id);
  const archive = useArchiveLeague(id);
  const leave = useLeave(id);
  const kick = useKick(id);
  const [copied, setCopied] = useState(false);

  const draftStatus = league.data?.draftStatus;
  // Los equipos solo existen con el draft terminado; antes no hay nada que pedir.
  const teams = useLeagueTeams(id, draftStatus === 'COMPLETED');
  const drivers = useDrivers();
  const constructors = useConstructors();

  // Arrancado el draft, la pantalla te lleva sola: al que lo arranco porque su mutacion
  // invalida la liga, y a los que estaban esperando porque useLeague sondea mientras esta
  // PENDING. Dispara en la TRANSICION PENDING -> LIVE y no en "esta LIVE": con la condicion
  // simple, el "Volver a la liga" de la pantalla del draft rebotaria para siempre.
  //
  // El ref guarda la liga junto al estado porque /leagues/:id es UNA ruta: pasar de la liga
  // A a la B cambia el parametro sin remontar el componente.
  const lastSeen = useRef<{ leagueId: number; status?: DraftStatus }>({
    leagueId: id,
    status: draftStatus,
  });
  useEffect(() => {
    const previous = lastSeen.current;
    if (previous.leagueId === id && previous.status === 'PENDING' && draftStatus === 'LIVE') {
      void navigate(`/leagues/${id}/draft`);
    }
    lastSeen.current = { leagueId: id, status: draftStatus };
  }, [draftStatus, id, navigate]);

  if (league.error) {
    return (
      <PageShell title="Liga">
        <Alert code={league.error.code} message={league.error.message} />
      </PageShell>
    );
  }
  if (!league.data) {
    // Adentro de PageShell y no suelto: si no, el texto aparece pegado al borde mientras el
    // contenido real va mucho mas adentro, y la pagina salta al llegar los datos.
    return (
      <PageShell title="Liga">
        <p className="text-slate-500">Cargando…</p>
      </PageShell>
    );
  }

  const l = league.data;
  // isOwner sale de la MEMBRESIA, no de createdById. El backend decide con LeagueMember.isOwner
  // (requireLeagueOwner), y el frontend miraba otra cosa: hoy coinciden, pero eran dos fuentes
  // de verdad para el mismo dato y la pantalla habria mostrado botones que el backend rechaza.
  const myMember = members.data?.find((m) => m.userId === me?.id) ?? null;
  const isOwner = myMember?.isOwner ?? false;
  const rosterOpen = l.draftStatus === 'PENDING';
  const draft = DRAFT_LABEL[l.draftStatus];
  const busy = startDraft.isPending || leave.isPending || kick.isPending || archive.isPending;
  const actionError =
    startDraft.error ?? archive.error ?? leave.error ?? kick.error ?? members.error;
  const cantidad = members.data?.length ?? 0;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(l.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard bloqueado (permisos o contexto inseguro): no mostramos "Copiado".
    }
  }

  // El owner no sale de su liga: la cierra (409 OWNER_CANNOT_LEAVE en el backend). Son dos
  // acciones distintas para dos roles distintos, no la misma con otro nombre. ADR-0009.
  const cerrar = isOwner ? (
    <ConfirmButton
      variant="danger"
      label="Archivar liga"
      confirmLabel="Sí, archivarla"
      consequence={`La liga se cierra para los ${cantidad} miembros y desaparece de sus listas. No se puede reabrir desde acá.`}
      disabled={busy}
      onConfirm={() => archive.mutate(undefined, { onSuccess: () => navigate('/leagues') })}
    />
  ) : (
    <ConfirmButton
      variant="danger"
      label="Salir de la liga"
      confirmLabel="Sí, salir"
      consequence={
        rosterOpen
          ? 'Vas a dejar la liga. Podés volver a entrar con el código mientras el draft no arranque.'
          : 'Vas a dejar la liga. El draft ya arrancó, así que no vas a poder volver a entrar.'
      }
      disabled={busy}
      onConfirm={() => leave.mutate(undefined, { onSuccess: () => navigate('/leagues') })}
    />
  );

  const error = actionError && (
    <div className="mb-3">
      <Alert code={actionError.code} message={actionError.message} />
    </div>
  );

  return (
    <PageShell
      title={l.name}
      actions={
        <Link to="/leagues" className="text-sm font-semibold text-slate-600 hover:underline">
          ← Mis ligas
        </Link>
      }
    >
      {l.draftStatus === 'PENDING' && (
        <AntesDelDraft
          code={l.inviteCode}
          copied={copied}
          onCopy={copyCode}
          cantidad={cantidad}
          maxMembers={l.maxMembers}
          miembros={members.data ?? []}
          isOwner={isOwner}
          busy={busy}
          error={error}
          onKick={(userId) => kick.mutate(userId)}
          onStart={() => startDraft.mutate()}
          cerrar={cerrar}
        />
      )}

      {l.draftStatus === 'LIVE' && <EnVivo leagueId={id} draftLabel={draft.text} cerrar={cerrar} />}

      {l.draftStatus === 'COMPLETED' && (
        <DespuesDelDraft
          leagueId={id}
          rows={armarFilas({
            picks: teams.data?.picks ?? [],
            miembros: members.data ?? [],
            standings: standings.data?.standings ?? [],
            drivers: drivers.data ?? [],
            constructors: constructors.data ?? [],
            myLeagueMemberId: myMember?.id ?? null,
          })}
          miEquipo={miEquipoDe(
            teams.data?.picks ?? [],
            myMember?.id ?? null,
            drivers.data ?? [],
            constructors.data ?? [],
          )}
          cargando={teams.isLoading}
          error={error}
          cerrar={cerrar}
        />
      )}
    </PageShell>
  );
}

// ─── Las tres composiciones ─────────────────────────────────────────

function AntesDelDraft({
  code,
  copied,
  onCopy,
  cantidad,
  maxMembers,
  miembros,
  isOwner,
  busy,
  error,
  onKick,
  onStart,
  cerrar,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
  cantidad: number;
  maxMembers: number;
  miembros: Parameters<typeof MembersTable>[0]['members'];
  isOwner: boolean;
  busy: boolean;
  error: React.ReactNode;
  onKick: (userId: number) => void;
  onStart: () => void;
  cerrar: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Manda el codigo: en este momento lo que falta es gente, y es la unica palanca que
          hay para conseguirla. La lista de dos nombres no dice nada que el usuario no sepa. */}
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Invitá a tus amigos</h2>
        <p className="mb-3 text-sm text-slate-600">
          Pasales este código para que entren desde “Unirme con código”.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded bg-slate-100 px-3 py-2 font-mono text-xl">{code}</code>
          <Button variant="secondary" onClick={onCopy}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">
          Ya están ({cantidad}/{maxMembers})
        </h2>
        {error}
        <MembersTable members={miembros} canKick={isOwner} onKick={onKick} />
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Arrancar el draft</h2>
        {isOwner ? (
          <>
            <p className="mb-3 text-sm text-slate-600">
              Una vez que arranca, no entra ni sale nadie.
            </p>
            {/* Confirmacion con la cuenta concreta: el caso que arruinaba la liga era
                arrancar estando solo, y "1 de 11" lo dice mejor que cualquier advertencia. */}
            <ConfirmButton
              label="Iniciar draft"
              confirmLabel="Sí, arrancar"
              consequence={`Vas a arrancar el draft con ${cantidad} de ${maxMembers} miembros. Nadie más va a poder entrar.`}
              disabled={busy}
              onConfirm={onStart}
            />
          </>
        ) : (
          <p className="text-sm text-slate-600">Solo quien creó la liga puede arrancar el draft.</p>
        )}
      </Card>

      <div>{cerrar}</div>
    </div>
  );
}

function EnVivo({
  leagueId,
  draftLabel,
  cerrar,
}: {
  leagueId: number;
  draftLabel: string;
  cerrar: React.ReactNode;
}) {
  // A esta pantalla, con el draft corriendo, solo se llega a proposito: el redirect lleva a
  // todo el mundo al draft al arrancar. Quien esta aca con un reloj de 60 segundos corriendo
  // se equivoco, asi que la pantalla no le ofrece nada mas que la vuelta.
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Badge tone="info">{draftLabel}</Badge>
        <p className="mt-3 text-slate-700">
          El draft está en curso. Si es tu turno, tenés 60 segundos para elegir.
        </p>
        <div className="mt-4">
          <Link
            to={`/leagues/${leagueId}/draft`}
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Volver al draft
          </Link>
        </div>
      </Card>
      <div>{cerrar}</div>
    </div>
  );
}

function DespuesDelDraft({
  rows,
  miEquipo,
  cargando,
  error,
  cerrar,
}: {
  leagueId: number;
  rows: TeamRowData[];
  miEquipo: { drivers: Driver[]; constructor: ConstructorRef | null } | null;
  cargando: boolean;
  error: React.ReactNode;
  cerrar: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {miEquipo && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Tu equipo</h2>
          <TeamLineup drivers={miEquipo.drivers} constructor={miEquipo.constructor} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">La liga</h2>
        {error}
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando equipos…</p>
        ) : (
          <LeagueTeamsTable rows={rows} />
        )}
      </Card>

      <div>{cerrar}</div>
    </div>
  );
}

// ─── Armado de datos ────────────────────────────────────────────────

// Los lookups viven aca, no en los componentes: buildDraftTeams devuelve ids a proposito, y
// las queries de pilotos y escuderias son de la pagina.
function resolver(team: DraftTeam, drivers: Driver[], constructors: { id: number }[]) {
  return {
    drivers: team.driverIds
      .map((driverId) => drivers.find((d) => d.id === driverId))
      .filter((d): d is Driver => d !== undefined),
    constructor:
      (constructors.find((c) => c.id === team.constructorId) as
        TeamRowData['constructor'] | undefined) ?? null,
  };
}

function miEquipoDe(
  picks: Parameters<typeof buildDraftTeams>[0],
  myLeagueMemberId: number | null,
  drivers: Driver[],
  constructors: { id: number }[],
) {
  const { mine } = buildDraftTeams(picks, myLeagueMemberId);
  return mine ? resolver(mine, drivers, constructors) : null;
}

function armarFilas({
  picks,
  miembros,
  standings,
  drivers,
  constructors,
  myLeagueMemberId,
}: {
  picks: Parameters<typeof buildDraftTeams>[0];
  miembros: { id: number; user: { name: string } }[];
  standings: TeamRowData['standing'][];
  drivers: Driver[];
  constructors: { id: number }[];
  myLeagueMemberId: number | null;
}): TeamRowData[] {
  const { mine, others } = buildDraftTeams(picks, myLeagueMemberId);
  const equipos = [...(mine ? [mine] : []), ...others];

  const filas = equipos.map((team) => {
    const standing = standings.find((s) => s?.leagueMemberId === team.leagueMemberId) ?? null;
    return {
      leagueMemberId: team.leagueMemberId,
      memberName:
        miembros.find((m) => m.id === team.leagueMemberId)?.user.name ??
        `miembro ${team.leagueMemberId}`,
      isMe: team.leagueMemberId === myLeagueMemberId,
      standing,
      ...resolver(team, drivers, constructors),
    };
  });

  // Con carreras procesadas manda la posicion; sin carreras, el orden es el de los picks y
  // el tuyo va primero (lo deja asi buildDraftTeams).
  return filas.every((f) => f.standing === null)
    ? filas
    : [...filas].sort((a, b) => (a.standing?.position ?? 99) - (b.standing?.position ?? 99));
}
