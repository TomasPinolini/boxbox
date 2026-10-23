import '@testing-library/jest-dom/vitest';

// Node 26 define `localStorage`/`sessionStorage` como getters lazy que devuelven undefined, y
// Vitest no los reemplaza por los de jsdom: dentro de los tests `localStorage` es undefined.
// Se detecta por el descriptor para no invocar el getter, que emite un ExperimentalWarning.
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

// jsdom 29 no implementa showModal() ni close(). Lo minimo: el atributo open, que es lo que
// mira Testing Library para dar por visible el contenido, y el evento 'close' del navegador.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  if (!this.open) return;
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};
