import { HelpPopover } from '../../components/ui';
import { PITCH } from '../help/tour-steps';

// placement="top" porque el gatillo está al pie del hero de login y register.
export function AboutBoxBox() {
  return (
    <HelpPopover title="¿Qué es BoxBox?" triggerText="¿Qué es BoxBox?" placement="top">
      {PITCH}
    </HelpPopover>
  );
}
