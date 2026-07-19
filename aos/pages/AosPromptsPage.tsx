import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import PromptsQueueScreen from "../presentation/screens/queues/prompts/PromptsQueueScreen";

const AosPromptsPage: React.FC = () => {
  usePageTitle("AOS Prompts");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.PROMPTS}>
      <PromptsQueueScreen />
    </AosRouteGate>
  );
};

export default AosPromptsPage;
