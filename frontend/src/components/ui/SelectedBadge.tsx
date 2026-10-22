// Circulo solido y no solo el ring: un ring rojo desaparece sobre escuderias de color parecido.
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
