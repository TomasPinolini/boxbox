import type { BadgeTone } from '../../components/ui';
import type { DraftStatus } from '../../models/league';

// Separado de LeagueCard.tsx: react-refresh/only-export-components exige que un archivo de
// componente solo exporte componentes — una constante al lado rompe el Fast Refresh de Vite.
export const DRAFT_LABEL: Record<DraftStatus, { text: string; tone: BadgeTone }> = {
  PENDING: { text: 'Draft pendiente', tone: 'neutral' },
  LIVE: { text: 'Draft en vivo', tone: 'info' },
  COMPLETED: { text: 'Draft completo', tone: 'success' },
};
