import React from "react";
import type { CreateAosPresentationServicesOptions } from "../../wiring/createAosPresentationServices";
import { ToastProvider } from "../ui/notifications/ToastProvider";
import { AosQueryProvider } from "./AosQueryProvider";
import { AosServicesProvider } from "./AosServicesProvider";

export interface AosProvidersProps {
  children: React.ReactNode;
  servicesOptions?: CreateAosPresentationServicesOptions;
}

/**
 * Root provider stack for all AOS routes.
 */
export const AosProviders: React.FC<AosProvidersProps> = ({ children, servicesOptions }) => {
  return (
    <AosQueryProvider>
      <AosServicesProvider servicesOptions={servicesOptions}>
        <ToastProvider>{children}</ToastProvider>
      </AosServicesProvider>
    </AosQueryProvider>
  );
};
