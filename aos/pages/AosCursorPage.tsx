import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosCursorPage: React.FC = () => {
  usePageTitle("AOS Cursor");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.CURSOR}>
      <AosPlaceholderLayout
        title="Cursor"
        description="Cursor Session capture and revision tracking. Implemented in Stage F."
      />
    </AosRouteGate>
  );
};

export default AosCursorPage;
