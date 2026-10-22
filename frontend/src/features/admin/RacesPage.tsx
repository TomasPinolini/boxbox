import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmButton,
  Field,
  PageShell,
  inputClass,
  selectClass,
  type BadgeTone,
} from '../../components/ui';
import type { Race, RaceStatus } from '../../models/race';
import { useCircuits } from './circuits.queries';
import { toIsoUtc, toLocalInput } from './race-dates';
import { useCreateRace, useRaces, useRemoveRace, useUpdateRace } from './races.queries';
import { useSeasons } from './seasons.queries';

// El <input type="datetime-local"> entrega "2026-07-05T14:00" y el backend exige ISO con zona.
const fechaObligatoria = z.string().min(1, 'Obligatorio').transform(toIsoUtc);

// Vacio sale como undefined: el backend tiene `.optional()` y un null lo rechaza.
const fechaOpcional = z
  .string()
  .transform((valor) => (valor === '' ? undefined : toIsoUtc(valor)))
  .optional();

const raceSchema = z.object({
  name: z.string().min(1, 'Obligatorio'),
  round: z.coerce.number().int().min(1, 'Tiene que ser 1 o más'),
  date: fechaObligatoria,
  lockDate: fechaObligatoria,
  qualifyingDate: fechaOpcional,
  sprintDate: fechaOpcional,
  seasonId: z.coerce.number().int().min(1, 'Obligatorio'),
  circuitId: z.coerce.number().int().min(1, 'Obligatorio'),
});

type RaceForm = z.input<typeof raceSchema>;

const LOCK_HINT_ID = 'race-lock-hint';

const EMPTY: RaceForm = {
  name: '',
  round: '',
  date: '',
  lockDate: '',
  qualifyingDate: '',
  sprintDate: '',
  seasonId: '',
  circuitId: '',
};

// Si otra pantalla lo necesita, se muda a su propio archivo (react-refresh/only-export-components).
const ESTADOS: Record<RaceStatus, { label: string; tone: BadgeTone }> = {
  UPCOMING: { label: 'Por correr', tone: 'info' },
  QUALIFYING_LOCKED: { label: 'Clasificación cerrada', tone: 'warning' },
  COMPLETED: { label: 'Corrida', tone: 'success' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  POSTPONED: { label: 'Postergada', tone: 'neutral' },
};

const fechaCorta = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export function RacesPage() {
  const races = useRaces();
  const seasons = useSeasons();
  const circuits = useCircuits();
  const createRace = useCreateRace();
  const updateRace = useUpdateRace();
  const removeRace = useRemoveRace();
  // Con `editing` en null el formulario da de alta.
  const [editing, setEditing] = useState<Race | null>(null);

  const form = useForm<RaceForm, unknown, z.output<typeof raceSchema>>({
    resolver: zodResolver(raceSchema),
    defaultValues: EMPTY,
  });

  const saving = createRace.isPending || updateRace.isPending;
  const saveError = editing ? updateRace.error : createRace.error;

  // El backend ordena por round nada mas, asi que con dos temporadas cargadas la tabla
  // alternaria 1, 1, 2, 2. Temporada mas nueva primero, y adentro el calendario en orden.
  const anioDe = (race: Race) => seasons.data?.find((s) => s.id === race.seasonId)?.year ?? 0;
  const ordenadas = [...(races.data ?? [])].sort(
    (a, b) => anioDe(b) - anioDe(a) || a.round - b.round,
  );

  function startEditing(race: Race) {
    setEditing(race);
    form.reset({
      name: race.name,
      round: race.round,
      date: toLocalInput(race.date),
      lockDate: toLocalInput(race.lockDate),
      qualifyingDate: toLocalInput(race.qualifyingDate),
      sprintDate: toLocalInput(race.sprintDate),
      seasonId: race.seasonId,
      circuitId: race.circuitId,
    });
  }

  function cancelEdit() {
    setEditing(null);
    form.reset(EMPTY);
  }

  return (
    <PageShell title="Carreras">
      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">
          {editing ? `Editar ${editing.name}` : 'Nueva carrera'}
        </h2>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (editing) {
              updateRace.mutate({ id: editing.id, input: values }, { onSuccess: cancelEdit });
            } else {
              createRace.mutate(values, { onSuccess: cancelEdit });
            }
          })}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <input className={inputClass} {...form.register('name')} />
          </Field>
          <Field label="Ronda" error={form.formState.errors.round?.message}>
            <input type="number" min="1" className={inputClass} {...form.register('round')} />
          </Field>
          {/* Opciones de sus propios listados y no de la tabla: si no, una temporada sin
              carreras no se podria elegir nunca. */}
          <Field label="Temporada" error={form.formState.errors.seasonId?.message}>
            <select className={selectClass} {...form.register('seasonId')}>
              <option value="">Elegí una temporada</option>
              {seasons.data?.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.year}
                  {season.isActive ? ' (activa)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Circuito" error={form.formState.errors.circuitId?.message}>
            <select className={selectClass} {...form.register('circuitId')}>
              <option value="">Elegí un circuito</option>
              {circuits.data?.map((circuit) => (
                <option key={circuit.id} value={circuit.id}>
                  {circuit.name} ({circuit.country})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de carrera" error={form.formState.errors.date?.message}>
            <input type="datetime-local" className={inputClass} {...form.register('date')} />
          </Field>
          {/* Cargar mal el cierre no se nota hasta que alguien juega: de ahi la ayuda. */}
          <div>
            <Field label="Cierre" error={form.formState.errors.lockDate?.message}>
              <input
                type="datetime-local"
                className={inputClass}
                aria-describedby={LOCK_HINT_ID}
                {...form.register('lockDate')}
              />
            </Field>
            <p id={LOCK_HINT_ID} className="mt-1 text-xs text-slate-500 dark:text-ink-muted">
              Momento desde el cual la carrera queda cerrada. Suele ser el inicio de la
              clasificación.
            </p>
          </div>
          <Field
            label="Clasificación (opcional)"
            error={form.formState.errors.qualifyingDate?.message}
          >
            <input
              type="datetime-local"
              className={inputClass}
              {...form.register('qualifyingDate')}
            />
          </Field>
          <Field label="Sprint (opcional)" error={form.formState.errors.sprintDate?.message}>
            <input type="datetime-local" className={inputClass} {...form.register('sprintDate')} />
          </Field>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={saving}>
              {editing ? 'Guardar cambios' : 'Crear carrera'}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
        {saveError && (
          <div className="mt-3">
            <Alert code={saveError.code} message={saveError.message} />
          </div>
        )}
      </Card>

      <Card>
        {races.error && <Alert code={races.error.code} message={races.error.message} />}
        {removeRace.error && (
          <div className="mb-3">
            <Alert code={removeRace.error.code} message={removeRace.error.message} />
          </div>
        )}
        {races.isPending && <p className="text-slate-500 dark:text-ink-muted">Cargando…</p>}
        {races.data?.length === 0 && (
          <p className="text-slate-500 dark:text-ink-muted">Todavía no hay carreras cargadas.</p>
        )}
        {ordenadas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-ink-border dark:text-ink-muted">
                  <th className="py-2">Ronda</th>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Temporada</th>
                  <th className="py-2">Circuito</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((race) => (
                  <tr
                    key={race.id}
                    className="border-b border-slate-100 last:border-0 dark:border-ink-border"
                  >
                    <td className="py-2 font-display">{race.round}</td>
                    <td className="py-2">{race.name}</td>
                    <td className="py-2">{anioDe(race) || '—'}</td>
                    <td className="py-2">{race.circuit.name}</td>
                    <td className="py-2">{fechaCorta.format(new Date(race.date))}</td>
                    <td className="py-2">
                      <Badge tone={ESTADOS[race.status].tone}>{ESTADOS[race.status].label}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {/* Con la carrera: "Editar" a secas es ambiguo en la lista de botones. */}
                        <Button
                          variant="secondary"
                          aria-label={`Editar ${race.name}`}
                          onClick={() => startEditing(race)}
                        >
                          Editar
                        </Button>
                        <ConfirmButton
                          label="Borrar"
                          ariaLabel={`Borrar ${race.name}`}
                          confirmLabel="Confirmar borrado"
                          consequence={`${race.name} se borra de la base, no se da de baja. Si ya tiene resultados cargados, el backend va a rechazarlo.`}
                          variant="danger"
                          disabled={removeRace.isPending}
                          onConfirm={() => removeRace.mutate(race.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
