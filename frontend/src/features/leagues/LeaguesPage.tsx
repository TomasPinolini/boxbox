import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button, Card, Field, PageShell, inputClass } from '../../components/ui';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { LeagueCard } from './LeagueCard';
import { useCreateLeague, useJoinLeague, useLeagues } from './leagues.queries';

// Mismas reglas que createLeagueSchema del backend: 4-20 chars, minusculas/numeros/guiones.
const createSchema = z.object({
  name: z.string().min(1, 'Obligatorio'),
  inviteCode: z
    .string()
    .regex(/^[a-z0-9-]{4,20}$/, '4 a 20 caracteres: minúsculas, números o guiones'),
});
const joinSchema = z.object({ inviteCode: z.string().min(4, 'Mínimo 4 caracteres') });

export function LeaguesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const leagues = useLeagues();
  const createLeague = useCreateLeague();
  const joinLeague = useJoinLeague();

  const createForm = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema) });
  const joinForm = useForm<z.infer<typeof joinSchema>>({ resolver: zodResolver(joinSchema) });

  async function logout() {
    await authService.logout();
    navigate('/login');
  }

  return (
    <PageShell
      title="Mis ligas"
      actions={
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>{user?.name}</span>
          <Button variant="secondary" onClick={logout}>
            Salir
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-4">
          {leagues.error && <Alert code={leagues.error.code} message={leagues.error.message} />}
          {leagues.data?.length === 0 && (
            <p className="text-slate-500">
              Todavía no estás en ninguna liga. Creá una o unite con un código.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {leagues.data?.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                onOpen={(id) => navigate(`/leagues/${id}`)}
              />
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Crear liga</h2>
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
            <h2 className="mb-3 text-lg font-semibold">Unirme con código</h2>
            <form
              onSubmit={joinForm.handleSubmit((values) =>
                joinLeague.mutate(values.inviteCode, { onSuccess: () => joinForm.reset() }),
              )}
              className="flex flex-col gap-3"
            >
              <Field label="Código" error={joinForm.formState.errors.inviteCode?.message}>
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
    </PageShell>
  );
}
