import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Alert,
  Button,
  Card,
  ConfirmButton,
  Field,
  PageShell,
  inputClass,
} from '../../components/ui';
import type { Circuit } from '../../models/circuit';
import { useCircuits, useCreateCircuit, useRemoveCircuit, useUpdateCircuit } from './circuits.queries';

// Mismas reglas que createCircuitSchema del backend. La longitud es el unico campo opcional:
// un string vacio se convierte en undefined para que no viaje como NaN ni como null.
const circuitSchema = z.object({
  name: z.string().min(1, 'Obligatorio'),
  country: z.string().min(1, 'Obligatorio'),
  city: z.string().min(1, 'Obligatorio'),
  circuitLength: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().positive('Tiene que ser mayor a 0').optional(),
  ),
  externalId: z.string().min(1, 'Obligatorio'),
});

type CircuitForm = z.input<typeof circuitSchema>;

const HINT_ID = 'circuit-external-id-hint';

const EMPTY: CircuitForm = { name: '', country: '', city: '', circuitLength: '', externalId: '' };

export function CircuitsPage() {
  const circuits = useCircuits();
  const createCircuit = useCreateCircuit();
  const updateCircuit = useUpdateCircuit();
  const removeCircuit = useRemoveCircuit();
  // Un solo formulario en dos modos, igual que temporadas: con `editing` en null da de alta.
  const [editing, setEditing] = useState<Circuit | null>(null);

  const form = useForm<CircuitForm, unknown, z.output<typeof circuitSchema>>({
    resolver: zodResolver(circuitSchema),
    defaultValues: EMPTY,
  });

  const saving = createCircuit.isPending || updateCircuit.isPending;
  const saveError = editing ? updateCircuit.error : createCircuit.error;

  function startEditing(circuit: Circuit) {
    setEditing(circuit);
    form.reset({
      name: circuit.name,
      country: circuit.country,
      city: circuit.city,
      circuitLength: circuit.circuitLength ?? '',
      externalId: circuit.externalId,
    });
  }

  function cancelEdit() {
    setEditing(null);
    form.reset(EMPTY);
  }

  return (
    <PageShell title="Circuitos">
      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">
          {editing ? `Editar ${editing.name}` : 'Nuevo circuito'}
        </h2>
        <form
          onSubmit={form.handleSubmit((values) => {
            if (editing) {
              updateCircuit.mutate({ id: editing.id, input: values }, { onSuccess: cancelEdit });
            } else {
              createCircuit.mutate(values, { onSuccess: cancelEdit });
            }
          })}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <input className={inputClass} {...form.register('name')} />
          </Field>
          <Field label="País" error={form.formState.errors.country?.message}>
            <input className={inputClass} {...form.register('country')} />
          </Field>
          <Field label="Ciudad" error={form.formState.errors.city?.message}>
            <input className={inputClass} {...form.register('city')} />
          </Field>
          <Field label="Longitud (km)" error={form.formState.errors.circuitLength?.message}>
            <input type="number" step="0.001" className={inputClass} {...form.register('circuitLength')} />
          </Field>
          {/* externalId es el unico campo que el admin no puede deducir mirando el circuito, y
              cargarlo mal falla en silencio: el circuito se crea igual y el sync no lo reconoce
              semanas despues. De ahi la ayuda, asociada por aria-describedby y no suelta al lado. */}
          <div>
            <Field label="ID externo" error={form.formState.errors.externalId?.message}>
              <input
                className={`${inputClass} font-mono`}
                aria-describedby={HINT_ID}
                {...form.register('externalId')}
              />
            </Field>
            <p id={HINT_ID} className="mt-1 text-xs text-slate-500">
              Clave con la que Jolpica identifica el circuito, por ejemplo <code>galvez</code> o{' '}
              <code>interlagos</code>. Si no coincide, el sync no lo va a reconocer.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={saving}>
              {editing ? 'Guardar cambios' : 'Crear circuito'}
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
        {circuits.error && <Alert code={circuits.error.code} message={circuits.error.message} />}
        {removeCircuit.error && (
          <div className="mb-3">
            <Alert code={removeCircuit.error.code} message={removeCircuit.error.message} />
          </div>
        )}
        {circuits.isPending && <p className="text-slate-500">Cargando…</p>}
        {circuits.data?.length === 0 && (
          <p className="text-slate-500">Todavía no hay circuitos cargados.</p>
        )}
        {circuits.data && circuits.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Nombre</th>
                  <th className="py-2">País</th>
                  <th className="py-2">Ciudad</th>
                  <th className="py-2">Longitud</th>
                  <th className="py-2">ID externo</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {circuits.data.map((circuit) => (
                  <tr key={circuit.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">{circuit.name}</td>
                    <td className="py-2">{circuit.country}</td>
                    <td className="py-2">{circuit.city}</td>
                    {/* "—" y no 0: hay circuitos del seed sin longitud, y cero seria un dato. */}
                    <td className="py-2 font-display">{circuit.circuitLength ?? '—'}</td>
                    <td className="py-2 font-mono text-xs text-slate-600">{circuit.externalId}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {/* El nombre accesible lleva el circuito: con varias filas, "Editar" a
                            secas es ambiguo para quien navega por lista de botones. */}
                        <Button
                          variant="secondary"
                          aria-label={`Editar ${circuit.name}`}
                          onClick={() => startEditing(circuit)}
                        >
                          Editar
                        </Button>
                        <ConfirmButton
                          label="Dar de baja"
                          confirmLabel="Confirmar baja"
                          // A diferencia de temporadas, esta baja SI es logica: el backend
                          // marca deletedAt y el circuito deja de listarse.
                          consequence={`${circuit.name} va a dejar de aparecer en los listados. Las carreras ya corridas lo conservan.`}
                          variant="danger"
                          disabled={removeCircuit.isPending}
                          onConfirm={() => removeCircuit.mutate(circuit.id)}
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
