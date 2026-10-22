import { Field, selectClass } from '../../components/ui';
import type { ConstructorRef } from '../../models/driver';

export function ConstructorFilter({
  constructors,
  value,
  onChange,
}: {
  constructors: ConstructorRef[];
  value: number | null;
  onChange: (constructorId: number | null) => void;
}) {
  return (
    <Field label="Escudería">
      <select
        className={selectClass}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      >
        <option value="">Todas</option>
        {constructors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
