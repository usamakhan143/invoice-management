import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import EvaluationQueueScreen from "../presentation/screens/queues/evaluation/EvaluationQueueScreen";

const AosEvaluationPage: React.FC = () => {
  usePageTitle("AOS Evaluation");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.EVALUATION}>
      <EvaluationQueueScreen />
    </AosRouteGate>
  );
};

export default AosEvaluationPage;
