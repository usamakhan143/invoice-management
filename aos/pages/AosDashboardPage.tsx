import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import FounderDashboardScreen from "../presentation/screens/dashboard/FounderDashboardScreen";

const AosDashboardPage: React.FC = () => {
  usePageTitle("AOS Dashboard");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.DASHBOARD}>
      <FounderDashboardScreen />
    </AosRouteGate>
  );
};

export default AosDashboardPage;
