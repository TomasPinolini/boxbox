import '@testing-library/jest-dom/vitest';

// Node 26 define `localStorage`/`sessionStorage` como getters lazy que devuelven undefined
// salvo que el proceso arranque con --localstorage-file. Vitest copia las props de la window
// de jsdom sobre globalThis pero no reemplaza las que Node ya definio, y como aca
// `window === globalThis`, el storage real de jsdom queda inaccesible: `localStorage` es
// undefined dentro de los tests aunque el environment sea jsdom (rompe auth.store.test.ts).
//
// Detectamos el caso por el descriptor —un accessor es el global de Node, un value property
// es el de jsdom— para no invocar el getter, que emite un ExperimentalWarning en stderr.
function isNodeLazyGlobal(name: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
  return descriptor !== undefined && typeof descriptor.get === 'function';
}

function makeStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (i: number) => [...entries.keys()][i] ?? null,
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => void entries.set(k, String(v)),
    removeItem: (k: string) => void entries.delete(k),
    clear: () => entries.clear(),
  } as Storage;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (isNodeLazyGlobal(name)) {
    Object.defineProperty(globalThis, name, {
      value: makeStorage(),
      configurable: true,
      writable: true,
    });
  }
}
