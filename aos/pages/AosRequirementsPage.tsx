import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import RequirementsQueueScreen from "../presentation/screens/queues/requirements/RequirementsQueueScreen";

const AosRequirementsPage: React.FC = () => {
  usePageTitle("AOS Requirements");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.REQUIREMENTS}>
      <RequirementsQueueScreen />
    </AosRouteGate>
  );
};

export default AosRequirementsPage;
