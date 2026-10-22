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

// Una sola frase y no un aria-live por dato: varias regiones vivas se encolan desordenadas.
// Sin los segundos restantes a proposito: el lector hablaria sin parar.
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
