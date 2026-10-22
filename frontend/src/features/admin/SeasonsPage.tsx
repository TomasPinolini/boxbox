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
} from '../../components/ui';
import type { Season } from '../../models/season';
import { cupoInsuficiente, deletionBlockedBy } from './season-dependencies';
import {
  useActivateSeason,
  useCreateSeason,
  useRemoveSeason,
  useSeasons,
  useUpdateSeason,
} from './seasons.queries';

// `coerce` porque un <input type="number"> entrega string y el backend lo rechazaria por tipo.
const seasonSchema = z.object({
  year: z.coerce.number().int().min(2020, 'Desde 2020').max(2030, 'Hasta 2030'),
  driverCount: z.coerce.number().int().min(1, 'Mínimo 1').max(30, 'Máximo 30'),
});

type SeasonForm = z.input<typeof seasonSchema>;

export function SeasonsPage() {
  const seasons = useSeasons();
  const createSeason = useCreateSeason();
  const updateSeason = useUpdateSeason();
  const removeSeason = useRemoveSeason();
  const activateSeason = useActivateSeason();
  // Con `editing` en null el formulario da de alta.
  const [editing, setEditing] = useState<Season | null>(null);

  const form = useForm<SeasonForm, unknown, z.output<typeof seasonSchema>>({
    resolver: zodResolver(seasonSchema),
  });

  const saving = createSeason.isPending || updateSeason.isPending;
  // Las acciones de fila comparten un solo Alert: nunca hay dos en vuelo a la vez.
  const rowError = removeSeason.error ?? activateSeason.error;
  const saveError = editing ? updateSeason.error : createSeason.error;

  function startEditing(season: Season) {
    setEditing(season);
    form.reset({ year: season.year, driverCount: season.driverCount });
  }

  function cancelEdit() {
    setEditing(null);
    form.reset({ year: undefined, driverCount: undefined });
  }

  return (
    <PageShell title="Temporadas">
      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">
          {editing ? `Editar temporada ${editing.year}` : 'Nueva temporada'}
        </h2>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (editing) {
              updateSeason.mutate({ id: editing.id, input: values }, { onSuccess: cancelEdit });
            } else {
              createSeason.mutate(values, { onSuccess: cancelEdit });
            }
          })}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="sm:w-32">
            <Field label="Año" error={form.formState.errors.year?.message}>
              <input type="number" className={inputClass} {...form.register('year')} />
            </Field>
          </div>
          <div className="sm:w-48">
            <Field label="Cantidad de pilotos" error={form.formState.errors.driverCount?.message}>
              <input type="number" className={inputClass} {...form.register('driverCount')} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {editing ? 'Guardar cambios' : 'Crear temporada'}
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
        {seasons.error && <Alert code={seasons.error.code} message={seasons.error.message} />}
        {rowError && (
          <div className="mb-3">
            <Alert code={rowError.code} message={rowError.message} />
          </div>
        )}
        {seasons.isPending && <p className="text-slate-500 dark:text-ink-muted">Cargando…</p>}
        {seasons.data && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-ink-border dark:text-ink-muted">
                <th className="py-2">Año</th>
                {/* "Cupo" y no "Pilotos": es cuantos entran, no cuantos hay cargados. */}
                <th className="py-2">Cupo</th>
                <th className="py-2">Carreras</th>
                <th className="py-2">Ligas</th>
                <th className="py-2">Pilotos</th>
                <th className="py-2">Estado</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {seasons.data.map((season) => (
                <tr key={season.id} className="border-b border-slate-100 last:border-0 dark:border-ink-border">
                  <td className="py-2 font-display">{season.year}</td>
                  <td className="py-2">
                    <span className="font-display">{season.driverCount}</span>
                    {cupoInsuficiente(season.driverCount) && (
                      <span className="mt-1 block text-xs text-amber-700">
                        Cupo bajo: no entra ninguna liga de dos personas.
                      </span>
                    )}
                  </td>
                  {/* "—" y no 0: sin conteos no se sabe, y un 0 afirmaria que no hay nada. */}
                  <td className="py-2 font-display">{season.counts?.races ?? '—'}</td>
                  <td className="py-2 font-display">{season.counts?.leagues ?? '—'}</td>
                  <td className="py-2 font-display">{season.counts?.drivers ?? '—'}</td>
                  <td className="py-2">
                    {/* Con texto y no solo color: un color solo no es informacion accesible. */}
                    {season.isActive ? <Badge tone="success">Activa</Badge> : null}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {/* Con el año: "Editar" a secas es ambiguo en la lista de botones. */}
                      <Button
                        variant="secondary"
                        aria-label={`Editar ${season.year}`}
                        onClick={() => startEditing(season)}
                      >
                        Editar
                      </Button>
                      {!season.isActive && (
                        <Button
                          variant="secondary"
                          aria-label={`Activar ${season.year}`}
                          disabled={activateSeason.isPending}
                          onClick={() => activateSeason.mutate(season.id)}
                        >
                          Activar
                        </Button>
                      )}
                      <ConfirmButton
                        label="Dar de baja"
                        confirmLabel="Confirmar baja"
                        consequence={`Vas a BORRAR la temporada ${season.year}. No se archiva: se elimina y no hay vuelta atrás.`}
                        variant="danger"
                        disabled={removeSeason.isPending || deletionBlockedBy(season) !== null}
                        onConfirm={() => removeSeason.mutate(season.id)}
                      />
                    </div>
                    {deletionBlockedBy(season) && (
                      <p className="mt-1 text-right text-xs text-slate-500 dark:text-ink-muted">
                        {deletionBlockedBy(season)}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
