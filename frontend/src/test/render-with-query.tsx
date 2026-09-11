import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

// Primer wrapper de React Query del repo: hasta Slice 14 ningun test renderizaba un componente
// que usara useQuery. Exporta SOLO esta funcion — el componente envoltorio se define adentro
// porque react-refresh/only-export-components se dispara si un archivo mezcla exports de
// componentes con exports que no lo son.
//
// QueryClient nuevo en cada llamada, no uno compartido: con uno solo, la cache de un test se
// filtra al siguiente y los resultados dependen del orden. `retry: false` porque el default de
// la app reintenta los 5xx (ver app/providers.tsx) y eso duplicaria la duracion de cada test
// de error.
export function renderWithQuery(ui: ReactElement, options: { route?: string } = {}): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
