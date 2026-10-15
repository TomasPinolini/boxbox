import { HelpPopover } from '../../components/ui';
import { PITCH } from '../help/tour-steps';

// AboutBoxBox: el "¿Qué es BoxBox?" de login y register — las dos únicas pantallas sin la
// barra de navegación, así que son las únicas que necesitan explicar qué es esto.
//
// Toda la mecánica del cartel (sheet en mobile, panel anclado en desktop, Escape, click afuera,
// foco que entra y vuelve) vivía acá y se mudó a components/ui/HelpPopover.tsx cuando el mismo
// patrón se necesitó en el resto de la app. Lo que queda acá es lo único propio de esta
// pantalla: que el panel crece hacia ARRIBA porque el gatillo está al pie del hero.
//
// El texto tampoco es propio: es el mismo PITCH que abre el tour de bienvenida. Estaba
// duplicado y se unificó — dos copias de la frase con la que la app se describe terminan
// diciendo cosas distintas en cuanto alguien edita una sola.
export function AboutBoxBox() {
  return (
    <HelpPopover title="¿Qué es BoxBox?" triggerText="¿Qué es BoxBox?" placement="top">
      {PITCH}
    </HelpPopover>
  );
}
