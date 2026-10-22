import type { ConstructorRef, Driver } from '../../models/driver';
import { DriverCard } from '../drivers/DriverCard';
import { groupByConstructor } from '../drivers/group-by-constructor';
import { ConstructorStrip } from './TeamLineup';

// Recibe el roster completo y apaga (`takenIds`) los ya elegidos en vez de sacarlos: si la
// lista se acortara, un piloto disponible se reacomodaria al lado del de otro equipo.
export function DraftPicker({
  category,
  drivers,
  constructors,
  takenIds,
  selectedId,
  onSelect,
}: {
  category: 'DRIVER' | 'CONSTRUCTOR';
  drivers: Driver[];
  constructors: ConstructorRef[];
  takenIds: Set<number>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (category === 'DRIVER') {
    return (
      <div className="flex flex-col gap-2" role="group" aria-label="Elegí un piloto">
        {groupByConstructor(drivers).map((group) => (
          <div key={group.key} className="grid grid-cols-2 gap-2">
            {group.items.map((d) => (
              <DriverCard
                key={d.id}
                driver={d}
                onOpen={onSelect}
                selected={selectedId === d.id}
                disabled={takenIds.has(d.id)}
                // Sin link a /constructors/:id: un click no puede sacarte del draft con el timer corriendo.
                linkToConstructor={false}
                // El aria-label reemplaza el contenido del boton: tiene que incluir dorsal y escuderia.
                ariaLabel={`${d.firstName} ${d.lastName}, número ${d.number}, ${d.constructor?.name ?? 'sin escudería'}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    // Una columna: ConstructorStrip es horizontal y a medio ancho queda desproporcionada.
    <div className="flex flex-col gap-2" role="group" aria-label="Elegí una escudería">
      {constructors.map((c) => (
        <ConstructorStrip
          key={c.id}
          constructor={c}
          onSelect={onSelect}
          selected={selectedId === c.id}
          disabled={takenIds.has(c.id)}
        />
      ))}
    </div>
  );
}
