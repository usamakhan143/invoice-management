import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";
import LearningReviewQueueScreen from "../presentation/screens/queues/learning/LearningReviewQueueScreen";

const AosLearningReviewPage: React.FC = () => {
  usePageTitle("AOS Learning Review");

  return (
    <AosRouteGate routeId={AOS_ROUTE_ID.LEARNING}>
      <LearningReviewQueueScreen />
    </AosRouteGate>
  );
};

export default AosLearningReviewPage;
