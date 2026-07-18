import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosPromptsPage: React.FC = () => {
  usePageTitle("AOS Prompts");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.PROMPTS}>
      <AosPlaceholderLayout
        title="Prompts"
        description="Prompt Packs, Artifacts, and Versions. Implemented in Stage E."
      />
    </AosRouteGate>
  );
};

export default AosPromptsPage;
