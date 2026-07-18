import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosRegistryPage: React.FC = () => {
  usePageTitle("AOS Registry");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.REGISTRY}>
      <AosPlaceholderLayout
        title="Registry"
        description="Module Registry browse and search. Implemented in Stage C."
      />
    </AosRouteGate>
  );
};

export default AosRegistryPage;
