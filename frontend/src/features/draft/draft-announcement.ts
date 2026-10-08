import type { DraftState } from '../../models/draft';

export interface AnnouncementInput {
  draftStatus: DraftState['draftStatus'];
  round: number | null;
  isMyTurn: boolean;
  /** Nombre de quien tiene el turno, ya resuelto. null si no hay turno activo. */
  currentTurnName: string | null;
  /** El ultimo pick, con los nombres ya resueltos. null si todavia no hubo ninguno. */
  lastPick: { memberName: string; label: string } | null;
}

// Arma la frase que escucha un lector de pantalla en el draft.
//
// Funcion pura y en su propio archivo, no un bloque dentro de DraftPage, por dos motivos:
// `react-refresh/only-export-components` prohibe exportar algo que no sea un componente desde
// un archivo de componente (ver features/leagues/draft-label.ts), y sobre todo porque asi se
// puede testear sin montar la pantalla entera, que depende del socket, de tres queries y del
// router.
//
// Por que una sola frase y no un aria-live por dato: varias regiones vivas compiten y el
// lector las encola, asi que un cambio de turno sonaria en tres pedazos desordenados.
//
// Deliberadamente SIN los segundos restantes: el contador baja una vez por segundo y meterlo
// aca haria que el lector hablara sin parar, tapando todo lo demas. El tiempo se comunica en
// la pantalla, no por voz.
export function draftAnnouncement({
  draftStatus,
  round,
  isMyTurn,
  currentTurnName,
  lastPick,
}: AnnouncementInput): string {
  if (draftStatus === 'COMPLETED') return 'El draft terminó. Los equipos quedaron armados.';
  if (draftStatus !== 'LIVE' || round === null) return '';

  const partes: string[] = [];
  if (lastPick) partes.push(`${lastPick.memberName} eligió ${lastPick.label}.`);
  partes.push(`Ronda ${round} de 3.`);
  // "Te toca a vos" antes que el nombre: es la unica parte que pide una accion.
  if (isMyTurn) partes.push('Te toca a vos.');
  else if (currentTurnName) partes.push(`Le toca a ${currentTurnName}.`);

  return partes.join(' ');
}
