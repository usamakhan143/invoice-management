import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import DeliveryListScreen from "../presentation/screens/delivery-list/DeliveryListScreen";

const AosDeliveryPage: React.FC = () => {
  usePageTitle("AOS Delivery");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.DELIVERY}>
      <DeliveryListScreen />
    </AosRouteGate>
  );
};

export default AosDeliveryPage;
