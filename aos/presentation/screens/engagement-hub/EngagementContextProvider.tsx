import React, { createContext, useContext, useMemo } from "react";
import type { DeliveryEngagementDto } from "../../../application/delivery/dto/DeliveryEngagementDto";

export interface EngagementContextValue {
  engagementId: string;
  engagement: DeliveryEngagementDto | null | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const EngagementContext = createContext<EngagementContextValue | null>(null);

export interface EngagementContextProviderProps {
  engagementId: string;
  engagement: DeliveryEngagementDto | null | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  children: React.ReactNode;
}

export const EngagementContextProvider: React.FC<EngagementContextProviderProps> = ({
  engagementId,
  engagement,
  isLoading,
  isError,
  error,
  refetch,
  children,
}) => {
  const value = useMemo(
    () => ({
      engagementId,
      engagement,
      isLoading,
      isError,
      error,
      refetch,
    }),
    [engagementId, engagement, isLoading, isError, error, refetch],
  );

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
};

export function useEngagementContext(): EngagementContextValue {
  const context = useContext(EngagementContext);
  if (!context) {
    throw new Error("useEngagementContext must be used within EngagementContextProvider");
  }
  return context;
}
