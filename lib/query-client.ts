import { QueryClient } from "@tanstack/react-query";

/** Cliente único: las acciones lo usan para invalidar caché tras cada mutación. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
