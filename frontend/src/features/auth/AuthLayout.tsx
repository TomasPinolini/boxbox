import type { ReactNode } from 'react';
import { AboutBoxBox } from './AboutBoxBox';

// El fondo de Login y Registro. Sin clases dark: la foto es igual en los dos temas.
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* scale-105: el blur difumina tambien el borde de la imagen, y agrandarla lo saca de pantalla. */}
      <img
        src="/login-hero-mobile.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px] md:hidden"
      />
      <img
        src="/login-hero-desktop.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 hidden h-full w-full scale-105 object-cover blur-[2px] md:block"
      />
      {/* Oscurecido + degrade: asegura el contraste del form sobre cualquier zona de la foto. */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center text-center md:items-stretch md:text-left">
        <div className="px-6 pt-14 md:px-16 md:pt-28">
          <img
            src="/logo-oscuro.svg"
            alt="boxbox"
            className="mx-auto h-10 w-auto md:mx-0 md:h-14"
          />
          <p className="mt-3.5 text-sm font-medium text-white/80 md:mt-4 md:text-base">
            Fantasy League de F1
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 md:justify-end md:px-24">
          {children}
        </div>

        <div className="px-6 pb-10 md:px-16 md:pb-14">
          <AboutBoxBox />
        </div>
      </div>
    </div>
  );
}
