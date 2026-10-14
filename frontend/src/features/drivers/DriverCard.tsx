import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Driver } from '../../models/driver';
import { ConstructorLogo } from './ConstructorLogo';
import { BADGE_DARK, textOn } from './team-color';

// DriverCard: un piloto en la lista. Entrada: el piloto. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo contrato que LeagueCard. Se reusa tal cual en
// TeamLineup (Tu equipo / equipo de un rival): un piloto se ve igual elegido que en el
// catalogo.
//
// Horizontal, no vertical (version anterior, pedido del usuario 2026-10-14): nombre + numero
// grande a la izquierda, foto a la derecha. El fondo es el color de la escuderia con un patron
// de cuadros encima — ver `CHECKER_PATTERN` — a proposito distinto del patron de lineas de
// circuito que usa la franja de escuderia en TeamLineup, para que ambos niveles ("esto es un
// piloto" / "esto es la escuderia") no se confundan a simple vista.
//
// El texto usa `textOn(color)`, no blanco fijo: el celeste de Williams o el turquesa de
// Mercedes son demasiado claros para blanco sobre ellos (mismo problema que ya resolvio
// `textOn` para TeamLineup). El numero va al mismo color pero mas transparente — object
// `numberColor` abajo, porque mezclar un hex con opacidad via Tailwind no es directo cuando el
// color es dinamico.
//
// La franja de escuderia (abajo) es un <Link> real, no un boton — pedido del usuario: tiene
// que llevar a /constructors/:id. Por eso NO puede vivir dentro del <button> del piloto: HTML
// no permite contenido interactivo anidado (un <a> dentro de un <button> es invalido). Van
// como hermanos dentro del mismo contenedor `relative`, cada uno con su propia area de click.
//
// Nombre y numero van en font-card (Racing Sans One), NO font-display (Saira Condensed, la
// que usan los numeros en standings/stats) — pedido del usuario 2026-10-14: la card tiene que
// "destacar" con su propia tipografia, distinta tanto de la general del sitio como de la de
// los numeros sitewide. Ver el comentario de --font-card en index.css.
const CHECKER_PATTERN = {
  backgroundImage: 'conic-gradient(#000 0 25%, transparent 0 50%, #000 0 75%, transparent 0)',
  backgroundSize: '14px 14px',
};

export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: (id: number) => void }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(driver.headshotUrl) && !failed;
  const color = driver.constructor?.color ?? '#64748b';
  const fg = textOn(color);
  const numberColor = fg === BADGE_DARK ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.55)';

  return (
    <div className="relative flex h-44 flex-col overflow-hidden rounded-lg shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:ring-ink-border">
      <div className="absolute inset-0" style={{ backgroundColor: color }} />
      <div className="absolute inset-0 opacity-[0.16]" style={CHECKER_PATTERN} />

      {/* aria-label con el nombre: sin el, un lector de pantalla lee el contenido suelto y los
          22 botones suenan igual. */}
      <button
        type="button"
        aria-label={`Ver piloto ${driver.firstName} ${driver.lastName}`}
        onClick={() => onOpen(driver.id)}
        className="relative z-10 flex flex-1 cursor-pointer items-stretch text-left"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-4 pr-1">
          <p className="font-card truncate text-base" style={{ color: fg }}>
            {driver.firstName}
          </p>
          <p className="font-card truncate text-xl" style={{ color: fg }}>
            {driver.lastName}
          </p>
          <p className="font-card text-5xl leading-none" style={{ color: numberColor }}>
            {driver.number}
          </p>
        </div>
        <div className="flex w-2/5 shrink-0 items-end justify-center">
          {hasPhoto ? (
            <img
              src={driver.headshotUrl!}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-contain object-bottom"
            />
          ) : (
            <span aria-hidden="true" className="font-card text-4xl" style={{ color: fg }}>
              {driver.firstName[0]}
              {driver.lastName[0]}
            </span>
          )}
        </div>
      </button>

      {driver.constructor ? (
        <Link
          to={`/constructors/${driver.constructor.id}`}
          className="relative z-10 flex min-h-11 items-center gap-2 bg-black/45 px-3 py-1.5 hover:bg-black/60"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90">
            <ConstructorLogo constructor={driver.constructor} />
          </span>
          <span className="truncate text-xs font-semibold text-white">{driver.constructor.name}</span>
        </Link>
      ) : (
        <div className="relative z-10 flex min-h-11 items-center bg-black/45 px-3 py-1.5">
          <span className="truncate text-xs font-semibold text-white/70">Sin equipo</span>
        </div>
      )}
    </div>
  );
}
