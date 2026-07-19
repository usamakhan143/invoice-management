import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import KnowledgeScreen from "../presentation/screens/knowledge/KnowledgeScreen";

const AosKnowledgePage: React.FC = () => {
  usePageTitle("AOS Knowledge");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.KNOWLEDGE}>
      <KnowledgeScreen />
    </AosRouteGate>
  );
};

export default AosKnowledgePage;
