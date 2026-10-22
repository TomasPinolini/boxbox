// El color del podio es redundante con el numero: nunca carga el significado solo.
const PODIUM: Record<number, string> = {
  1: 'bg-amber-300 text-amber-950',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-amber-700 text-white',
};

// Misma caja de 24px con y sin pildora, para que las filas del podio no midan distinto.
const BOX = 'inline-flex h-6 min-w-6 items-center justify-center font-display tabular-nums';

export function Position({ value }: { value: number | null }) {
  // null no es cero: en el historial de un piloto significa que no clasifico.
  if (value === null)
    return <span className={`${BOX} text-slate-400 dark:text-ink-muted`}>—</span>;

  const podium = PODIUM[value];
  if (!podium)
    return <span className={`${BOX} text-slate-500 dark:text-ink-muted`}>{value}</span>;

  return <span className={`${BOX} rounded-full px-1.5 font-bold ${podium}`}>{value}</span>;
}
