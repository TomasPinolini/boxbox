import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../services/api-error';

// Un QueryClient para toda la app. Reintenta UNA vez y solo lo reintentable: 5xx o error de
// red (status 0). Un 4xx es determinístico — repetir el mismo request no lo arregla.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error instanceof ApiError ? error.status : 500;
        return (status >= 500 || status === 0) && failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
