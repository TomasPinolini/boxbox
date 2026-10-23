import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmButton,
  HelpPopover,
  PageShell,
} from '../../components/ui';
import { RenameLeague } from './RenameLeague';
import { RivalTeamModal } from './RivalTeamModal';
import type { ConstructorRef, Driver } from '../../models/driver';
import type { DraftStatus } from '../../models/league';
import { useAuthStore } from '../../store/auth.store';
import { buildDraftTeams, type DraftTeam } from '../draft/draft-teams';
import { resolveTeam } from '../drivers/resolve-team';
import { TeamLineup } from '../draft/TeamLineup';
import { useConstructors, useDrivers } from '../drivers/drivers.queries';
import { DRAFT_LABEL } from './draft-label';
import { LeagueTeamsTable, type TeamRowData } from './LeagueTeamsTable';
import { MembersTable } from './MembersTable';
import {
  useArchiveLeague,
  useRenameLeague,
  useKick,
  useLeague,
  useLeagueTeams,
  useLeave,
  useMembers,
  useStandings,
  useStartDraft,
} from './leagues.queries';

// Tres composiciones distintas (antes, durante y despues del draft): el usuario viene a
// preguntar cosas distintas en cada momento y una sola pantalla no sirve para todas.

export function LeagueDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  // El equipo que se mira vive en la URL: el link se comparte y Atras funciona.
  const [searchParams, setSearchParams] = useSearchParams();
  const equipoElegido = Number(searchParams.get('equipo')) || null;
  const me = useAuthStore((s) => s.user);
  const league = useLeague(id);
  const members = useMembers(id);
  const standings = useStandings(id);
  const startDraft = useStartDraft(id);
  const archive = useArchiveLeague(id);
  const rename = useRenameLeague(id);
  const leave = useLeave(id);
  const kick = useKick(id);
  const [copied, setCopied] = useState(false);

  const draftStatus = league.data?.draftStatus;
  const teams = useLeagueTeams(id, draftStatus === 'COMPLETED');
  const drivers = useDrivers();
  const constructors = useConstructors();

  // Redirige al draft en la TRANSICION PENDING -> LIVE, no en "esta LIVE": si no, el
  // "Volver a la liga" del draft rebotaria para siempre. El ref guarda tambien la liga
  // porque pasar de /leagues/A a /leagues/B no remonta el componente.
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
    // Dentro de PageShell para que la pagina no salte al llegar los datos.
    return (
      <PageShell title="Liga">
        <p className="text-slate-500 dark:text-ink-muted">Cargando…</p>
      </PageShell>
    );
  }

  const l = league.data;
  // isOwner sale de la membresia, no de createdById: es lo que mira requireLeagueOwner.
  const myMember = members.data?.find((m) => m.userId === me?.id) ?? null;
  const isOwner = myMember?.isOwner ?? false;
  const rosterOpen = l.draftStatus === 'PENDING';
  const draft = DRAFT_LABEL[l.draftStatus];
  const busy = startDraft.isPending || leave.isPending || kick.isPending || archive.isPending || rename.isPending;
  const actionError =
    startDraft.error ??
    archive.error ??
    rename.error ??
    leave.error ??
    kick.error ??
    members.error ??
    teams.error ??
    standings.error;
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

  // El owner no puede salir de su liga (409 OWNER_CANNOT_LEAVE): la archiva.
  const cerrarOSalir = isOwner ? (
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

  const acciones = <div className="flex flex-wrap items-end gap-2">{cerrarOSalir}</div>;

  const onOpenDriver = (driverId: number) => navigate(`/drivers/${driverId}`);

  const error = actionError && (
    <div className="mb-3">
      <Alert code={actionError.code} message={actionError.message} />
    </div>
  );

  return (
    <PageShell
      title={
        isOwner ? (
          <RenameLeague currentName={l.name} disabled={busy} onRename={(name) => rename.mutate(name)} />
        ) : (
          l.name
        )
      }
      actions={
        <Link to="/leagues" className="text-sm font-semibold text-slate-600 hover:underline dark:text-ink-muted">
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
          acciones={acciones}
        />
      )}

      {l.draftStatus === 'LIVE' && <EnVivo leagueId={id} draftLabel={draft.text} acciones={acciones} />}

      {l.draftStatus === 'COMPLETED' && (
        <DespuesDelDraft
          rows={armarFilas({
            picks: teams.data?.picks ?? [],
            miembros: members.data ?? [],
            standings: standings.data?.standings ?? [],
            drivers: drivers.data ?? [],
            constructors: constructors.data ?? [],
            myLeagueMemberId: myMember?.id ?? null,
          })}
          miEquipo={equipoDe(
            teams.data?.picks ?? [],
            myMember?.id ?? null,
            drivers.data ?? [],
            constructors.data ?? [],
          )}
          rival={
            equipoElegido && equipoElegido !== myMember?.id
              ? {
                  nombre:
                    members.data?.find((m) => m.id === equipoElegido)?.user.name ?? 'ese jugador',
                  motto: members.data?.find((m) => m.id === equipoElegido)?.user.motto ?? null,
                  equipo: equipoDe(
                    teams.data?.picks ?? [],
                    equipoElegido,
                    drivers.data ?? [],
                    constructors.data ?? [],
                  ),
                }
              : null
          }
          onSelect={(leagueMemberId) => setSearchParams({ equipo: String(leagueMemberId) })}
          onCerrarRival={() => setSearchParams({})}
          onOpenDriver={onOpenDriver}
          cargando={teams.isLoading}
          error={error}
          acciones={acciones}
        />
      )}
    </PageShell>
  );
}

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
  acciones,
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
  acciones: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Invitá a tus amigos</h2>
          <HelpPopover title="¿Hasta cuándo puede entrar gente?">
            Mientras el draft no arranque, entra y sale quien quiera. Una vez que arranca, la lista
            queda cerrada: no entra nadie nuevo, y quien se fue no puede volver.
          </HelpPopover>
        </div>
        <p className="mb-3 text-sm text-slate-600 dark:text-ink-muted">
          Pasales este código para que entren desde “Unirme con código”.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded bg-slate-100 px-3 py-2 font-mono text-xl dark:bg-ink-surface dark:text-ink-text">{code}</code>
          <Button variant="secondary" onClick={onCopy}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold">
            Ya están ({cantidad}/{maxMembers})
          </h2>
          {/* No dice "hay 22 pilotos": de maxMembers = floor(driverCount / 2) no se puede
              volver a driverCount (23 pilotos tambien dan 11). */}
          <HelpPopover title={`¿Por qué el tope es ${maxMembers}?`}>
            Porque cada equipo se lleva 2 pilotos de la grilla y nadie puede repetir el de otro.
            El tope sale de cuántos pilotos tiene la temporada: con más gente no alcanzarían para
            que todos armen equipo.
          </HelpPopover>
        </div>
        {error}
        <MembersTable members={miembros} canKick={isOwner} onKick={onKick} />
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Arrancar el draft</h2>
          <HelpPopover title="¿Qué es el draft?">
            Es el reparto de la grilla: eligen por turnos hasta que todos tengan 2 pilotos y 1
            escudería. Arrancalo cuando estén todos los que esperás, porque después la liga queda
            cerrada.
          </HelpPopover>
        </div>
        {isOwner ? (
          <>
            <p className="mb-3 text-sm text-slate-600 dark:text-ink-muted">
              Una vez que arranca, no entra ni sale nadie.
            </p>
            <ConfirmButton
              label="Iniciar draft"
              confirmLabel="Sí, arrancar"
              consequence={`Vas a arrancar el draft con ${cantidad} de ${maxMembers} miembros. Nadie más va a poder entrar.`}
              disabled={busy}
              onConfirm={onStart}
            />
          </>
        ) : (
          <p className="text-sm text-slate-600 dark:text-ink-muted">Solo quien creó la liga puede arrancar el draft.</p>
        )}
      </Card>

      <div>{acciones}</div>
    </div>
  );
}

function EnVivo({
  leagueId,
  draftLabel,
  acciones,
}: {
  leagueId: number;
  draftLabel: string;
  acciones: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Badge tone="info">{draftLabel}</Badge>
        <p className="mt-3 text-slate-700 dark:text-ink-muted">
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
      <div>{acciones}</div>
    </div>
  );
}

function DespuesDelDraft({
  rows,
  miEquipo,
  rival,
  onSelect,
  onCerrarRival,
  onOpenDriver,
  cargando,
  error,
  acciones,
}: {
  rows: TeamRowData[];
  miEquipo: { drivers: Driver[]; constructor: ConstructorRef | null } | null;
  rival: {
    nombre: string;
    motto: string | null;
    equipo: { drivers: Driver[]; constructor: ConstructorRef | null } | null;
  } | null;
  onSelect: (leagueMemberId: number) => void;
  onCerrarRival: () => void;
  onOpenDriver: (driverId: number) => void;
  cargando: boolean;
  error: React.ReactNode;
  acciones: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {miEquipo && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Tu equipo</h2>
          <TeamLineup
            drivers={miEquipo.drivers}
            constructor={miEquipo.constructor}
            onOpenDriver={onOpenDriver}
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">La liga</h2>
        {error}
        {cargando ? (
          <p className="text-sm text-slate-500 dark:text-ink-muted">Cargando equipos…</p>
        ) : (
          <LeagueTeamsTable rows={rows} onSelect={onSelect} />
        )}
      </Card>

      <div>{acciones}</div>

      {rival?.equipo && (
        <RivalTeamModal
          nombre={rival.nombre}
          motto={rival.motto}
          drivers={rival.equipo.drivers}
          constructor={rival.equipo.constructor}
          onOpenDriver={onOpenDriver}
          onClose={onCerrarRival}
        />
      )}
    </div>
  );
}

function resolver(team: DraftTeam, drivers: Driver[], constructors: ConstructorRef[]) {
  return resolveTeam(team.driverIds, team.constructorId, drivers, constructors);
}

function equipoDe(
  picks: Parameters<typeof buildDraftTeams>[0],
  leagueMemberId: number | null,
  drivers: Driver[],
  constructors: ConstructorRef[],
) {
  const { mine } = buildDraftTeams(picks, leagueMemberId);
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
  miembros: { id: number; user: { name: string; avatarUrl: string | null } }[];
  standings: TeamRowData['standing'][];
  drivers: Driver[];
  constructors: ConstructorRef[];
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
      memberAvatarUrl: miembros.find((m) => m.id === team.leagueMemberId)?.user.avatarUrl ?? null,
      isMe: team.leagueMemberId === myLeagueMemberId,
      standing,
      ...resolver(team, drivers, constructors),
    };
  });

  // Sin carreras procesadas se respeta el orden de buildDraftTeams (el tuyo primero).
  return filas.every((f) => f.standing === null)
    ? filas
    : [...filas].sort((a, b) => (a.standing?.position ?? 99) - (b.standing?.position ?? 99));
}
