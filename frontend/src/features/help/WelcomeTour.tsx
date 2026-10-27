import { useState } from 'react';
import { Modal } from '../../components/ui';
import { TOUR_STEPS } from './tour-steps';

// Se muestra una sola vez sin guardar nada: lo dispara un flag en el state de la ruta al
// registrarse (ver RegisterPage), que no sobrevive a una recarga.
export function WelcomeTour({ onClose }: { onClose: () => void }) {
  const [paso, setPaso] = useState(0);
  const actual = TOUR_STEPS[paso];
  const esUltimo = paso === TOUR_STEPS.length - 1;

  return (
    <Modal
      label="Bienvenido a BoxBox"
      onClose={onClose}
      className="enter-scale m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white shadow-2xl backdrop:bg-black/70 dark:bg-ink"
    >
      <div
        data-autofocus
        // Recibe foco al abrir sin entrar en el orden de tabulación: así un lector de pantalla
        // empieza por el paso y no por "Saltear".
        tabIndex={-1}
        className="p-6 outline-none"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="font-display text-sm font-bold tracking-wide text-red-600">
            PASO {paso + 1} DE {TOUR_STEPS.length}
          </span>
          <span className="flex-grow" />
          <span aria-hidden="true" className="flex gap-1.5">
            {TOUR_STEPS.map((step, i) => (
              <span
                key={step.title}
                className={`h-[7px] w-[7px] rounded-full ${
                  i === paso ? 'bg-red-600' : 'bg-slate-200 dark:bg-ink-border'
                }`}
              />
            ))}
          </span>
        </div>

        {/* aria-live: el paso cambia sin navegar, nada mas lo anunciaria. */}
        <div aria-live="polite">
          <h2 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 dark:text-ink-text">
            {actual.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-ink-muted">
            {actual.body}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {!esUltimo && (
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-ink-muted dark:hover:text-ink-text"
            >
              Saltear
            </button>
          )}
          <span className="flex-grow" />
          <button
            type="button"
            onClick={() => (esUltimo ? onClose() : setPaso((p) => p + 1))}
            className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            {esUltimo ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
