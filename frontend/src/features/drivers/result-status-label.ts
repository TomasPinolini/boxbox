import type { BadgeTone } from '../../components/ui';
import type { RaceResultStatus } from '../../models/driver';

// Archivo propio por react-refresh/only-export-components.
export const RESULT_STATUS_LABEL: Record<RaceResultStatus, { text: string; tone: BadgeTone }> = {
  CLASSIFIED: { text: 'Clasificó', tone: 'success' },
  DNF: { text: 'Abandonó', tone: 'warning' },
  DSQ: { text: 'Descalificado', tone: 'warning' },
  DNS: { text: 'No largó', tone: 'neutral' },
};
