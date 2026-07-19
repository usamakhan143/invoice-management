import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import EngagementHubLayoutScreen from "../presentation/screens/engagement-hub/EngagementHubLayoutScreen";

const AosEngagementHubPage: React.FC = () => {
  usePageTitle("Engagement");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.DELIVERY}>
      <EngagementHubLayoutScreen />
    </AosRouteGate>
  );
};

export default AosEngagementHubPage;
