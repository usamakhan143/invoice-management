import { useContext } from "react";
import { AosServicesContext } from "./AosServicesContext";
import type { AosPresentationServices } from "../wiring/types";

/**
 * Access AOS application services from presentation hooks and screens.
 */
export function useAosServices(): AosPresentationServices {
  const context = useContext(AosServicesContext);

  if (!context) {
    throw new Error("useAosServices must be used within AosServicesProvider");
  }

  return context.services;
}
