import { QueryClient } from "@tanstack/react-query";

/**
 * Default TanStack Query client for AOS — frozen defaults per Frontend Architecture.
 */
export function createAosQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
