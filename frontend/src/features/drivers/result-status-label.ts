import type { BadgeTone } from '../../components/ui';
import type { RaceResultStatus } from '../../models/driver';

// Separado de los componentes: react-refresh/only-export-components exige que un archivo de
// componente solo exporte componentes. Mismo criterio que features/leagues/draft-label.ts.
export const RESULT_STATUS_LABEL: Record<RaceResultStatus, { text: string; tone: BadgeTone }> = {
  CLASSIFIED: { text: 'Clasificó', tone: 'success' },
  DNF: { text: 'Abandonó', tone: 'warning' },
  DSQ: { text: 'Descalificado', tone: 'warning' },
  DNS: { text: 'No largó', tone: 'neutral' },
};
