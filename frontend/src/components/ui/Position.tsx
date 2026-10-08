// Posicion en una tabla de clasificacion. Existe para dos cosas a la vez.
//
// 1. Unificar. La posicion se dibujaba de cuatro maneras distintas: `font-mono text-slate-500`
//    en el campeonato, `font-mono` a secas en las standings de una liga, y SIN ningun
//    tratamiento en el historial de un piloto — justo la columna titulada "Posicion". Cuatro
//    copias divergentes de la misma idea.
// 2. El podio. En F1 los tres primeros no son "los primeros de una lista", son una categoria
//    aparte: hay una ceremonia para ellos. Un numero gris identico al del puesto 18 tira esa
//    jerarquia a la basura.
//
// El color NO carga el significado solo: el numero sigue ahi y sigue siendo el que manda, asi
// que quien no distingue el oro del bronce lee exactamente la misma informacion. Es
// codificacion redundante, el mismo criterio que ya usa el indicador de movimiento de
// StandingsTable (flecha + color, nunca color solo).
const PODIUM: Record<number, string> = {
  1: 'bg-amber-300 text-amber-950',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-amber-700 text-white',
};

// Todas las variantes comparten la misma caja de 24px, con y sin pildora: si solo la llevaran
// los tres primeros, las filas 1 a 3 medirian distinto que el resto y la tabla se escalonaria.
const BOX = 'inline-flex h-6 min-w-6 items-center justify-center font-display tabular-nums';

export function Position({ value }: { value: number | null }) {
  // null no es cero: en el historial de un piloto significa que no clasifico.
  if (value === null) return <span className={`${BOX} text-slate-400`}>—</span>;

  const podium = PODIUM[value];
  if (!podium) return <span className={`${BOX} text-slate-500`}>{value}</span>;

  return <span className={`${BOX} rounded-full px-1.5 font-bold ${podium}`}>{value}</span>;
}
