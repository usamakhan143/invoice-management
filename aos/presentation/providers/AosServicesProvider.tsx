import React, { useMemo } from "react";
import { createAosPresentationServices } from "../../wiring/createAosPresentationServices";
import type { CreateAosPresentationServicesOptions } from "../../wiring/createAosPresentationServices";
import { AosServicesContext } from "./AosServicesContext";

export interface AosServicesProviderProps {
  children: React.ReactNode;
  servicesOptions?: CreateAosPresentationServicesOptions;
}

/**
 * Supplies application services to AOS hooks and screens.
 */
export const AosServicesProvider: React.FC<AosServicesProviderProps> = ({
  children,
  servicesOptions,
}) => {
  const value = useMemo(
    () => ({ services: createAosPresentationServices(servicesOptions) }),
    [servicesOptions],
  );

  return (
    <AosServicesContext.Provider value={value}>{children}</AosServicesContext.Provider>
  );
};
