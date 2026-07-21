import { createContext } from "react";
import type { AosPresentationServices } from "../wiring/types";

export interface AosServicesContextValue {
  services: AosPresentationServices;
}

export const AosServicesContext = createContext<AosServicesContextValue | null>(null);
