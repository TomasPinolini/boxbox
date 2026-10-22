import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  Alert,
  Button,
  Card,
  Field,
  HelpPopover,
  PageShell,
  inputClass,
} from '../../components/ui';
import { useConstructors, useDrivers } from '../drivers/drivers.queries';
import { WelcomeTour } from '../help/WelcomeTour';
import { LeagueCard } from './LeagueCard';
import { useCreateLeague, useJoinLeague, useLeagues } from './leagues.queries';

// Mismas reglas que createLeagueSchema del backend.
const createSchema = z.object({
  name: z.string().min(1, 'Obligatorio'),
  inviteCode: z
    .string()
    .regex(/^[a-z0-9-]{4,20}$/, '4 a 20 caracteres: minúsculas, números o guiones'),
});
const joinSchema = z.object({ inviteCode: z.string().min(4, 'Mínimo 4 caracteres') });

export function LeaguesPage() {
  const navigate = useNavigate();
  // RegisterPage no puede abrir el tour (GuestOnly la desmonta al haber sesión): manda un flag
  // en el state de la ruta y se abre acá.
  const location = useLocation();
  const veniaDelRegistro = Boolean((location.state as { tour?: boolean } | null)?.tour);
  const [tourOpen, setTourOpen] = useState(veniaDelRegistro);
  // El state de la ruta lo guarda el navegador y sobrevive a un F5: sin borrarlo, el tour se
  // reabriría en cada recarga.
  useEffect(() => {
    if (!veniaDelRegistro) return;
    void navigate(location.pathname, { replace: true, state: null });
  }, [veniaDelRegistro, location.pathname, navigate]);

  const leagues = useLeagues();
  const drivers = useDrivers();
  const constructors = useConstructors();
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();

  const createForm = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<z.infer<typeof joinSchema>>({ resolver: zodResolver(joinSchema) });

  return (
    <PageShell
      title="Mis ligas"
      titleHelp={
        <HelpPopover title="¿Qué es una liga?">
          Un grupo privado de amigos. Cada uno arma su equipo de 2 pilotos y 1 escudería en un
          draft, y durante la temporada suman los puntos de los resultados reales de la Fórmula 1.
        </HelpPopover>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-4">
          {leagues.error && <Alert code={leagues.error.code} message={leagues.error.message} />}
          {leagues.data?.length === 0 && (
            <p className="text-slate-500 dark:text-ink-muted">
              Todavía no estás en ninguna liga. Creá una o unite con un código.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {leagues.data?.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                drivers={drivers.data ?? []}
                constructors={constructors.data ?? []}
                onOpen={(id) => navigate(`/leagues/${id}`)}
              />
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <Card>
            {/* El "?" va en el titulo y no junto al campo: Field envuelve todo en un <label>, y
                un <button> adentro de un <label> es HTML invalido. */}
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Crear liga</h2>
              <HelpPopover title="¿Qué es el código de invitación?">
                Es el nombre con el que tus amigos entran a tu liga. Lo elegís vos: de 4 a 20
                caracteres, minúsculas, números o guiones. Después se lo pasás y ellos lo pegan en
                «Unirme con código».
              </HelpPopover>
            </div>
            <form
              onSubmit={createForm.handleSubmit((values) =>
                createLeague.mutate(values, {
                  onSuccess: (league) => navigate(`/leagues/${league.id}`),
                }),
              )}
              className="flex flex-col gap-3"
            >
              <Field label="Nombre" error={createForm.formState.errors.name?.message}>
                <input className={inputClass} {...createForm.register('name')} />
              </Field>
              <Field
                label="Código de invitación"
                error={createForm.formState.errors.inviteCode?.message}
              >
                <input
                  className={`${inputClass} font-mono`}
                  {...createForm.register('inviteCode')}
                />
              </Field>
              {createLeague.error && (
                <Alert code={createLeague.error.code} message={createLeague.error.message} />
              )}
              <Button type="submit" disabled={createLeague.isPending}>
                Crear
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Unirme con código</h2>
              <HelpPopover title="¿De dónde saco un código?">
                Te lo tiene que pasar quien creó la liga: es una palabra corta que eligió esa
                persona. Si nadie te invitó todavía, creá tu propia liga y pasales vos el código a
                tus amigos.
              </HelpPopover>
            </div>
            <form
              onSubmit={joinForm.handleSubmit((values) =>
                joinLeague.mutate(values.inviteCode, { onSuccess: () => joinForm.reset() }),
              )}
              className="flex flex-col gap-3"
            >
              {/* No "Código" a secas: se confundiría con el "Código de invitación" de crear. */}
              <Field
                label="Código que te pasaron"
                error={joinForm.formState.errors.inviteCode?.message}
              >
                <input className={`${inputClass} font-mono`} {...joinForm.register('inviteCode')} />
              </Field>
              {joinLeague.error && (
                <Alert code={joinLeague.error.code} message={joinLeague.error.message} />
              )}
              <Button type="submit" variant="secondary" disabled={joinLeague.isPending}>
                Unirme
              </Button>
            </form>
          </Card>
        </aside>
      </div>

      {tourOpen && <WelcomeTour onClose={() => setTourOpen(false)} />}
    </PageShell>
  );
}
