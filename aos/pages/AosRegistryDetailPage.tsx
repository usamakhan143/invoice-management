import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import RegistryDetailScreen from "../presentation/screens/registry-detail/RegistryDetailScreen";

const AosRegistryDetailPage: React.FC = () => {
  usePageTitle("AOS Module Detail");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.REGISTRY}>
      <RegistryDetailScreen />
    </AosRouteGate>
  );
};

export default AosRegistryDetailPage;
