import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosDashboardPage: React.FC = () => {
  usePageTitle("AOS Dashboard");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.DASHBOARD}>
      <AosPlaceholderLayout
        title="AOS Dashboard"
        description="Delivery operating system overview. Metrics and engagement summaries will appear here in Stage B."
      />
    </AosRouteGate>
  );
};

export default AosDashboardPage;
