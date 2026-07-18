import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosPlaceholderLayout, AosRouteGate } from "../presentation/components";

const AosEvaluationPage: React.FC = () => {
  usePageTitle("AOS Evaluation");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.EVALUATION}>
      <AosPlaceholderLayout
        title="Evaluation"
        description="Evaluation Engine, rubrics, and pass/fail gates. Implemented in Stage G."
      />
    </AosRouteGate>
  );
};

export default AosEvaluationPage;
