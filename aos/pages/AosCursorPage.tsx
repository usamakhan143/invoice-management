import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import CursorQueueScreen from "../presentation/screens/queues/cursor/CursorQueueScreen";

const AosCursorPage: React.FC = () => {
  usePageTitle("AOS Cursor");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.CURSOR}>
      <CursorQueueScreen />
    </AosRouteGate>
  );
};

export default AosCursorPage;
