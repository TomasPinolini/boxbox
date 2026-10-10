import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { groupByConstructor } from '../drivers/group-by-constructor';
import { TeamBadge } from '../drivers/TeamBadge';

// DraftPicker: reemplaza el <select> de texto plano que tenía el draft. Mismos componentes
// que /drivers (Slice 14) — DriverAvatar, TeamBadge, ConstructorLogo — para que un piloto se
// vea igual eligiéndolo acá que mirándolo en el catálogo (auditoría de UX, 2026-10-09, punto
// "22 nombres en un dropdown, sin foto, dorsal ni color").
//
// Un <button> por opción, no radios escondidos detrás de un <label>: el estado seleccionado
// se ve (ring + fondo) y el teclado lo recorre gratis (Tab, Enter/Espacio) sin JS extra para
// flechas — no hace falta el patrón roving-tabindex de un <select> nativo, son como mucho 22.
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

function Tile({
  id,
  selected,
  disabled,
  onSelect,
  children,
  borderColor,
  label,
}: {
  id: number;
  selected: boolean;
  disabled: boolean;
  onSelect: (id: number) => void;
  children: React.ReactNode;
  borderColor: string;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={disabled ? undefined : selected}
      aria-label={disabled ? `${label} (ya elegido)` : label}
      onClick={() => onSelect(id)}
      className={`flex w-full flex-col items-center gap-2 rounded-md border-t-4 bg-slate-50 p-3 text-center transition ${
        disabled
          ? 'cursor-not-allowed grayscale opacity-50'
          : selected
            ? 'ring-2 ring-red-600'
            : 'hover:bg-slate-100'
      }`}
      style={{ borderTopColor: disabled ? '#cbd5e1' : borderColor }}
    >
      {children}
    </button>
  );
}

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
              <Tile
                key={d.id}
                id={d.id}
                selected={selectedId === d.id}
                disabled={takenIds.has(d.id)}
                onSelect={onSelect}
                borderColor={d.constructor?.color ?? '#e2e8f0'}
                label={`${d.firstName} ${d.lastName}`}
              >
                <DriverAvatar driver={d} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {d.firstName} {d.lastName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-display tabular-nums">#{d.number}</span>
                  </div>
                  <div className="mt-1">
                    <TeamBadge constructor={d.constructor} />
                  </div>
                </div>
              </Tile>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Elegí una escudería">
      {constructors.map((c) => (
        <Tile
          key={c.id}
          id={c.id}
          selected={selectedId === c.id}
          disabled={takenIds.has(c.id)}
          onSelect={onSelect}
          borderColor={c.color}
          label={c.name}
        >
          <ConstructorLogo constructor={c} />
          <p className="truncate text-sm font-semibold">{c.name}</p>
        </Tile>
      ))}
    </div>
  );
}
