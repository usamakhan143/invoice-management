import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import CreateEngagementScreen from "../presentation/screens/create-engagement/CreateEngagementScreen";

const AosCreateEngagementPage: React.FC = () => {
  usePageTitle("Create engagement");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.DELIVERY}>
      <CreateEngagementScreen />
    </AosRouteGate>
  );
};

export default AosCreateEngagementPage;
