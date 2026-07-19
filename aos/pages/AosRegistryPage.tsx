import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import RegistryScreen from "../presentation/screens/registry/RegistryScreen";

const AosRegistryPage: React.FC = () => {
  usePageTitle("AOS Registry");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.REGISTRY}>
      <RegistryScreen />
    </AosRouteGate>
  );
};

export default AosRegistryPage;
