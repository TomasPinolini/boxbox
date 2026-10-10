import { Card } from '../../components/ui';
import type { Driver } from '../../models/driver';
import { DriverAvatar } from './DriverAvatar';
import { TeamBadge } from './TeamBadge';

// DriverCard: un piloto en la lista. Entrada: el piloto. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo contrato que LeagueCard.
//
// Vertical y centrada (foto arriba, texto abajo), no la fila horizontal original — auditoria
// de UX 2026-10-09: con la grilla fija en 2 columnas (ver DriversPage), una fila horizontal
// quedaba apretada contra la mitad del ancho disponible. El formato "tarjeta" (mas alto que
// ancho) es el que de verdad aprovecha una columna angosta, en celu o en desktop por igual.
//
// La tarjeta entera es el boton, con el patron "stretched link": un <button> vacio en
// `absolute inset-0` sobre un contenedor `relative`. Dos cosas al precio de una:
//
// 1. Area tactil. El unico lugar clickeable es toda la tarjeta, no un link de texto chico.
// 2. Foco. El outline global de :focus-visible se dibuja en el borde del inset-0, o sea en el
//    borde de la tarjeta: navegando con Tab se ve que la tarjeta esta seleccionada.
//
// Por que un <button> hijo y no envolver todo en uno: el content model de <button> es
// contenido de frase, y <Card> renderiza un <section>. Anidarlo seria HTML invalido.
export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: (id: number) => void }) {
  return (
    <Card
      // Franja del equipo arriba, no a la izquierda: en una tarjeta vertical lee como el
      // encabezado de color de una trading card. Sin escuderia cae a un gris neutro y no a
      // "sin franja" — si desapareciera, esa tarjeta mediria 4px menos de alto que las demas.
      className="relative border-t-4 text-center transition-shadow hover:shadow-md"
      style={{ borderTopColor: driver.constructor?.color ?? '#e2e8f0' }}
    >
      <div className="flex flex-col items-center gap-2">
        <DriverAvatar driver={driver} size={64} />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">
            {driver.firstName} {driver.lastName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-display tabular-nums">#{driver.number}</span>
            <span>{driver.code}</span>
          </div>
          <div className="mt-2">
            <TeamBadge constructor={driver.constructor} />
          </div>
        </div>
      </div>
      {/* aria-label con el nombre: la tarjeta entera es el boton, y su nombre accesible tiene
          que distinguirla de las otras 21. Sin el, un lector de pantalla lee el contenido
          suelto y los 22 botones suenan igual. */}
      <button
        type="button"
        aria-label={`Ver piloto ${driver.firstName} ${driver.lastName}`}
        className="absolute inset-0 cursor-pointer rounded-lg"
        onClick={() => onOpen(driver.id)}
      />
    </Card>
  );
}
