import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosDeliveryPage: React.FC = () => {
  usePageTitle("AOS Delivery");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.DELIVERY}>
      <AosPlaceholderLayout
        title="Delivery"
        description="Delivery Engagement management — the AOS aggregate root. Implemented in Stage B."
      />
    </AosRouteGate>
  );
};

export default AosDeliveryPage;
