import type { ConstructorRef, Driver } from '../../models/driver';
import { ConstructorLogo } from '../drivers/ConstructorLogo';
import { DriverAvatar } from '../drivers/DriverAvatar';
import { TeamBadge } from '../drivers/TeamBadge';

// DraftPicker: reemplaza el <select> de texto plano que tenía el draft. Mismos componentes
// que /drivers (Slice 14) — DriverAvatar, TeamBadge, ConstructorLogo — para que un piloto se
// vea igual eligiéndolo acá que mirándolo en el catálogo (auditoría de UX, 2026-10-09, punto
// "22 nombres en un dropdown, sin foto, dorsal ni color").
//
// Un <button> por opción, no radios escondidos detrás de un <label>: el estado seleccionado
// se ve (ring + fondo) y el teclado lo recorre gratis (Tab, Enter/Espacio) sin JS extra para
// flechas — no hace falta el patrón roving-tabindex de un <select> nativo, son como mucho 22.

function Tile({
  id,
  selected,
  onSelect,
  children,
  borderColor,
  label,
}: {
  id: number;
  selected: boolean;
  onSelect: (id: number) => void;
  children: React.ReactNode;
  borderColor: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-3 rounded-md border-l-4 bg-slate-50 p-3 text-left transition ${
        selected ? 'ring-2 ring-red-600' : 'hover:bg-slate-100'
      }`}
      style={{ borderLeftColor: borderColor }}
    >
      {children}
    </button>
  );
}

export function DraftPicker({
  category,
  drivers,
  constructors,
  selectedId,
  onSelect,
}: {
  category: 'DRIVER' | 'CONSTRUCTOR';
  drivers: Driver[];
  constructors: ConstructorRef[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (category === 'DRIVER') {
    return (
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Elegí un piloto">
        {drivers.map((d) => (
          <Tile
            key={d.id}
            id={d.id}
            selected={selectedId === d.id}
            onSelect={onSelect}
            borderColor={d.constructor?.color ?? '#e2e8f0'}
            label={`${d.firstName} ${d.lastName}`}
          >
            <DriverAvatar driver={d} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {d.firstName} {d.lastName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="font-display tabular-nums">#{d.number}</span>
                <TeamBadge constructor={d.constructor} />
              </div>
            </div>
          </Tile>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Elegí una escudería">
      {constructors.map((c) => (
        <Tile
          key={c.id}
          id={c.id}
          selected={selectedId === c.id}
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
