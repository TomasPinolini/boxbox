import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '../services/api-error';

// Reintenta una vez y solo 5xx o error de red: un 4xx es determinístico, repetirlo no lo arregla.
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
