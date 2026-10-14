import { useState } from 'react';
import type { Driver } from '../../models/driver';
import { textOn } from './team-color';

// DriverCard: un piloto en la lista. Entrada: el piloto. Salida: onOpen(id). No llama a ningun
// servicio — eso es de la pagina. Mismo contrato que LeagueCard. Se reusa tal cual en
// TeamLineup (Tu equipo / equipo de un rival): un piloto se ve igual elegido que en el
// catalogo.
//
// Foto a pantalla completa, no avatar + texto abajo (version anterior, auditoria de UX
// 2026-10-09) — pedido del usuario 2026-10-14: la card entera es la foto, con el numero
// arriba a la derecha y nombre + escuderia sobre un degrade abajo, como una trading card real.
//
// El fondo (color de la escuderia) es SIEMPRE el mismo elemento, tenga foto o no — no
// "aparece si falta la foto". Pedido del usuario 2026-10-14: las fotos son PNG recortados
// (sin fondo propio), y el color de la escuderia tiene que asomar alrededor del piloto. Por
// eso la foto va con `object-contain` (entra entera, no se recorta) y no `object-cover` (que
// la estiraria a llenar la card tapando el fondo). Sin foto, las iniciales ocupan ese mismo
// lugar — nunca una card vacia.
//
// No usa el componente <Card> compartido: Card trae padding fijo (p-4/md:p-6) que una foto a
// sangrado tendria que pisar con otra clase, y Tailwind no garantiza cual de las dos gana por
// especificidad. Mas simple armar el contenedor acá.
//
// La tarjeta entera es el boton, con el patron "stretched link": un <button> vacio en
// `absolute inset-0` sobre un contenedor `relative`. El outline global de :focus-visible se
// dibuja en el borde del inset-0, o sea en el borde de la tarjeta.
export function DriverCard({ driver, onOpen }: { driver: Driver; onOpen: (id: number) => void }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = Boolean(driver.headshotUrl) && !failed;
  const color = driver.constructor?.color ?? '#64748b';

  return (
    <div
      className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
      style={{ backgroundColor: color }}
    >
      {hasPhoto ? (
        <img
          src={driver.headshotUrl!}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-5xl font-bold"
          style={{ color: textOn(color) }}
        >
          {driver.firstName[0]}
          {driver.lastName[0]}
        </span>
      )}
      {/* Degrade: asegura que el nombre blanco se lea pase lo que pase en esa zona de la foto
          — mismo recurso que el fondo del login, por la misma razon. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
      <span className="absolute right-2.5 top-2 font-display text-2xl font-extrabold italic text-white/50">
        {driver.number}
      </span>
      <div className="absolute inset-x-2.5 bottom-2.5">
        <p className="truncate text-sm font-bold text-white">
          {driver.firstName} {driver.lastName}
        </p>
        <p className="truncate text-xs text-white/85">{driver.constructor?.name ?? 'Sin equipo'}</p>
      </div>
      {/* aria-label con el nombre: la tarjeta entera es el boton, y su nombre accesible tiene
          que distinguirla de las otras 21. Sin el, un lector de pantalla lee el contenido
          suelto y los 22 botones suenan igual. */}
      <button
        type="button"
        aria-label={`Ver piloto ${driver.firstName} ${driver.lastName}`}
        className="absolute inset-0 cursor-pointer"
        onClick={() => onOpen(driver.id)}
      />
    </div>
  );
}
