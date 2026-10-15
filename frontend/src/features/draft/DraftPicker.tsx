import type { ConstructorRef, Driver } from '../../models/driver';
import { DriverCard } from '../drivers/DriverCard';
import { groupByConstructor } from '../drivers/group-by-constructor';
import { ConstructorStrip } from './TeamLineup';

// DraftPicker: reemplaza el <select> de texto plano que tenía el draft. Reusa DriverCard y
// ConstructorStrip TAL CUAL — las mismas cards que ves en /drivers y despues en "Tu equipo"
// (TeamLineup) — en vez de una tarjeta propia del picker. Pedido del usuario 2026-10-15: el
// piloto o la escuderia por la que estás eligiendo tiene que verse igual que el resultado, no
// una aproximación con otros componentes (DriverAvatar + TeamBadge sueltos, como era antes).
// Las dos reciben `selected`/`disabled`/`ariaLabel` justamente para este caso de uso, sin
// cambiar su comportamiento por defecto en /drivers ni en TeamLineup.
//
// Un <button>/ConstructorStrip con onSelect por opción, no radios escondidos detrás de un
// <label>: el estado seleccionado se ve (ring) y el teclado lo recorre gratis (Tab,
// Enter/Espacio) sin JS extra para flechas — no hace falta el patrón roving-tabindex de un
// <select> nativo, son como mucho 22.
//
// Recibe el ROSTER COMPLETO de la temporada, no solo los disponibles — la primera version
// pasaba `state.available` (solo lo que queda), y a medida que avanzaba el draft la lista se
// acortaba: el companero de equipo que quedaba disponible se reacomodaba al lado del piloto
// de OTRO equipo (bug reportado en la revision de esta pantalla, 2026-10-10). Mostrar siempre
// el roster entero y apagar (`takenIds`) los ya elegidos, en vez de sacarlos, evita el
// reacomodo de raiz: nada desaparece, asi que nada se puede reubicar mal.
//
// groupByConstructor queda igual — protege contra el caso (mas raro, pero real en F1: un
// reserva a mitad de temporada) de una escuderia con un numero impar de pilotos en el roster
// ya de base, no solo contra los picks del draft.

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
                // Sin link a /constructors/:id acá: un click en la franja de abajo no puede
                // sacarte del draft con el timer corriendo. Bug reportado por el usuario.
                linkToConstructor={false}
                // El aria-label REEMPLAZA el contenido del boton para el nombre accesible, no
                // se suma: con solo el nombre, el dorsal y la escuderia que se dibujan adentro
                // no llegaban al lector. Y la escuderia es la mitad de la decision en esta
                // pantalla, con 60 segundos corriendo.
                ariaLabel={`${d.firstName} ${d.lastName}, número ${d.number}, ${d.constructor?.name ?? 'sin escudería'}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    // Una columna, no grid-cols-2: ConstructorStrip es horizontal a lo ancho (así se ve en
    // "Tu equipo"), apretarla a la mitad del ancho la deja desproporcionada. Pedido del
    // usuario 2026-10-15.
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
