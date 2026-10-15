// Insignia de "elegido": un check blanco sobre un circulo rojo solido, en una esquina de la
// card. Nace del DraftPicker (Slice 17) — el unico ring (ring-2 ring-red-600) que marcaba la
// seleccion se volvia invisible contra escuderias de color parecido (el rojo de Ferrari sobre
// un ring rojo, por ejemplo) o pasaba desapercibido contra el degrade de DriverCard. Un circulo
// solido con icono no depende de contraste contra el fondo de la card: el fondo ES siempre el
// mismo rojo, sea cual sea el piloto o la escuderia de abajo.
export function SelectedBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-2 ring-white dark:ring-ink"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}
