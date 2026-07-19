import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import PlaybookScreen from "../presentation/screens/playbook/PlaybookScreen";

const AosPlaybookPage: React.FC = () => {
  usePageTitle("AOS Playbook");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.PLAYBOOK}>
      <PlaybookScreen />
    </AosRouteGate>
  );
};

export default AosPlaybookPage;
