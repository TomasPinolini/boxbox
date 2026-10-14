import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Driver } from '../../models/driver';
import { ConstructorLogo } from './ConstructorLogo';

// DriverCard: un piloto en la lista. Entrada: el piloto. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo contrato que LeagueCard. Se reusa tal cual en
// TeamLineup (Tu equipo / equipo de un rival): un piloto se ve igual elegido que en el
// catalogo.
//
// Horizontal, no vertical (version anterior, pedido del usuario 2026-10-14): nombre + numero
// grande a la izquierda, foto a la derecha.
//
// Fondo: degrade diagonal del color de la escuderia hacia INK (#1a1a1c, el mismo anclaje que
// --color-ink en index.css) — reemplaza al cuadriculado + textOn() de la version anterior.
// Pedido del usuario 2026-10-14: TODAS las cards con tipografia blanca, sin excepcion. Con
// textOn() el turquesa de Mercedes o el celeste de Williams eran demasiado claros y el texto
// pasaba a negro — correcto por contraste, pero rompia la consistencia que pedia el usuario.
// El degrade resuelve las dos cosas a la vez: el color de la escuderia sigue siendo
// protagonista arriba a la izquierda, pero se apaga hacia abajo a la derecha — justo donde
// vive el texto — asi que ahi SIEMPRE hay oscuridad de sobra para blanco fijo, sea cual sea
// el color de origen. Probado contra los 11 colores de la temporada 2026, incluidos los dos
// mas claros, en el wireframe que aprobo el usuario antes de este cambio.
//
// INK fijo (no el --color-ink de modo oscuro): esta card se ve igual tenga la app el tema que
// tenga — no depende de prefers-color-scheme, es un degrade propio de la card.
const INK = '#1a1a1c';

// La franja de escuderia (abajo) es un <Link> real, no un boton — pedido del usuario: tiene
// que llevar a /constructors/:id. Por eso NO puede vivir dentro del <button> del piloto: HTML
// no permite contenido interactivo anidado (un <a> dentro de un <button> es invalido). Van
// como hermanos dentro del mismo contenedor `relative`, cada uno con su propia area de click.
//
// Nombre y numero van en font-card (Racing Sans One), NO font-display (Saira Condensed, la
// que usan los numeros en standings/stats) — pedido del usuario 2026-10-14: la card tiene que
// "destacar" con su propia tipografia, distinta tanto de la general del sitio como de la de
// los numeros sitewide. Ver el comentario de --font-card en index.css.
export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: (id: number) => void }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(driver.headshotUrl) && !failed;
  const color = driver.constructor?.color ?? '#64748b';

  return (
    <div className="relative flex h-44 flex-col overflow-hidden rounded-lg shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:ring-ink-border">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(135deg, ${color} 0%, ${INK} 65%)` }}
      />

      {/* aria-label con el nombre: sin el, un lector de pantalla lee el contenido suelto y los
          22 botones suenan igual. */}
      <button
        type="button"
        aria-label={`Ver piloto ${driver.firstName} ${driver.lastName}`}
        onClick={() => onOpen(driver.id)}
        className="relative z-10 flex flex-1 cursor-pointer items-stretch text-left"
      >
        <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-4 pr-1">
          <p className="font-card truncate text-base text-white">{driver.firstName}</p>
          <p className="font-card truncate text-xl text-white">{driver.lastName}</p>
          <p className="font-card text-5xl leading-none text-white/55">{driver.number}</p>
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
            <span aria-hidden="true" className="font-card text-4xl text-white">
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
