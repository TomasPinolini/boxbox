import { Card } from '../../components/ui';
import type { Driver } from '../../models/driver';
import { DriverAvatar } from './DriverAvatar';
import { TeamBadge } from './TeamBadge';

// DriverCard: un piloto en la lista. Entrada: el piloto. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo contrato que LeagueCard.
//
// La tarjeta entera es el boton, con el patron "stretched link": un <button> vacio en
// `absolute inset-0` sobre un contenedor `relative`. Tres cosas al precio de una:
//
// 1. Densidad. El boton "Ver piloto ->" ocupaba una linea propia y la escuderia otra; con la
//    tarjeta clickeable desaparece la primera, y la escuderia entra en la misma linea que
//    el numero. 22 pilotos x ~55px menos de alto.
// 2. Area tactil. Antes el unico lugar clickeable era un link de texto de 13px de alto, muy
//    por debajo de los 44px que pide una guia de touch. Ahora es toda la tarjeta.
// 3. Foco. El outline global de :focus-visible se dibuja en el borde del inset-0, o sea en el
//    borde de la tarjeta: navegando con Tab se ve que la tarjeta esta seleccionada.
//
// Por que un <button> hijo y no envolver todo en uno: el content model de <button> es
// contenido de frase, y <Card> renderiza un <section>. Anidarlo seria HTML invalido.
export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: (id: number) => void }) {
  return (
    <Card
      // Franja del equipo al borde izquierdo, el patron de los timing screens de F1. Sin
      // escuderia cae a un gris neutro y no a "sin borde": si la franja desapareciera, esa
      // tarjeta mediria 4px menos de ancho que las demas y la grilla se desalinearia.
      className="relative border-l-4 transition-shadow hover:shadow-md"
      style={{ borderLeftColor: driver.constructor?.color ?? '#e2e8f0' }}
    >
      <div className="flex items-center gap-3">
        <DriverAvatar driver={driver} size={48} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">
            {driver.firstName} {driver.lastName}
          </h2>
          {/* flex-wrap y no una linea fija: "Racing Bulls" al lado de "#30 - LAW" no entra en
              320px, y bajar de linea es mejor que desbordar. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-display tabular-nums">#{driver.number}</span>
            <span>{driver.code}</span>
            <TeamBadge constructor={driver.constructor} />
          </div>
        </div>
        <span aria-hidden="true" className="shrink-0 font-semibold text-red-600">
          →
        </span>
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
