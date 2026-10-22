import type { BadgeTone } from '../../components/ui';
import type { DraftStatus } from '../../models/league';

// Archivo propio: una constante junto a un componente rompe el Fast Refresh de Vite
// (react-refresh/only-export-components).
export const DRAFT_LABEL: Record<DraftStatus, { text: string; tone: BadgeTone }> = {
  PENDING: { text: 'Draft pendiente', tone: 'neutral' },
  LIVE: { text: 'Draft en vivo', tone: 'info' },
  COMPLETED: { text: 'Draft completo', tone: 'success' },
};
