import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosPlaybookPage: React.FC = () => {
  usePageTitle("AOS Playbook");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.PLAYBOOK}>
      <AosPlaceholderLayout
        title="Playbook"
        description="Agency Playbook — templates, rubrics, and delivery guides. Implemented in later stages."
      />
    </AosRouteGate>
  );
};

export default AosPlaybookPage;
