import React, { lazy, Suspense, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAosQueryClient } from "./createAosQueryClient";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((devtools) => ({
        default: devtools.ReactQueryDevtools,
      })),
    )
  : null;

export interface AosQueryProviderProps {
  children: React.ReactNode;
}

/**
 * TanStack Query provider scoped to AOS routes.
 */
export const AosQueryProvider: React.FC<AosQueryProviderProps> = ({ children }) => {
  const [queryClient] = useState(() => createAosQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {ReactQueryDevtools ? (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  );
};
