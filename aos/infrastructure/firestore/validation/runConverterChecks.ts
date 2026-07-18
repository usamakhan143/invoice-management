/**
 * Pure converter checks (no Firestore).
 * Run: npm run aos:validate
 */

import { AGENCY_TYPE } from "../../../constants/agencyType";
import { ENGAGEMENT_TYPE } from "../../../constants/engagementType";
import { DELIVERY_STATE } from "../../../domain/delivery/deliveryState";
import { DELIVERY_TEMPLATE_STATE } from "../../../domain/delivery/templateState";
import { DELIVERY_QUALITY_REPORT_STATE } from "../../../domain/delivery/qualityReportState";
import {
  deliveryEngagementFromFirestore,
  deliveryEngagementToFirestore,
} from "../models/deliveryEngagementDocument";
import {
  deliveryTemplateFromFirestore,
  deliveryTemplateToFirestore,
} from "../models/deliveryTemplateDocument";
import {
  deliveryQualityReportFromFirestore,
  deliveryQualityReportToFirestore,
} from "../models/deliveryQualityReportDocument";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

export interface ConverterCheckResult {
  passed: number;
  failed: string[];
}

export function runAosConverterChecks(): ConverterCheckResult {
  const failed: string[] = [];
  let passed = 0;

  const check = (label: string, condition: boolean) => {
    if (condition) {
      passed += 1;
    } else {
      failed.push(label);
    }
  };

  const now = firebase.firestore.Timestamp.now();
  const nowMs = now.toMillis();

  const engagementDoc = deliveryEngagementToFirestore({
    companyId: "company-1",
    title: "Engagement A",
    scopeSummary: "Scope",
    status: DELIVERY_STATE.DRAFT,
    agencyType: AGENCY_TYPE.WEB,
    engagementType: ENGAGEMENT_TYPE.GREENFIELD,
    erpCustomerId: "customer-1",
    deliveryLeadUserId: "user-1",
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: nowMs,
    updatedAt: nowMs,
  });
  const engagement = deliveryEngagementFromFirestore("eng-1", engagementDoc);
  check("delivery engagement round-trip title", engagement?.title === "Engagement A");
  check("delivery engagement round-trip status", engagement?.status === DELIVERY_STATE.DRAFT);
  check(
    "delivery engagement toFirestore omits undefined optional fields",
    !Object.values(engagementDoc).some((value) => value === undefined),
  );

  const templateDoc = deliveryTemplateToFirestore({
    companyId: "company-1",
    name: "Web Template",
    agencyType: AGENCY_TYPE.WEB,
    status: DELIVERY_TEMPLATE_STATE.DRAFT,
    versionNumber: 1,
    lifecyclePhaseKeys: ["intake", "discovery"],
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: nowMs,
    updatedAt: nowMs,
  });
  const template = deliveryTemplateFromFirestore("tpl-1", templateDoc);
  check("delivery template round-trip name", template?.name === "Web Template");
  check(
    "delivery template round-trip phases",
    template?.lifecyclePhaseKeys.join(",") === "intake,discovery",
  );

  const reportDoc = deliveryQualityReportToFirestore({
    companyId: "company-1",
    deliveryEngagementId: "eng-1",
    status: DELIVERY_QUALITY_REPORT_STATE.GENERATING,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: nowMs,
    updatedAt: nowMs,
  });
  const report = deliveryQualityReportFromFirestore("rep-1", reportDoc);
  check("delivery quality report round-trip status", report?.status === DELIVERY_QUALITY_REPORT_STATE.GENERATING);
  check(
    "delivery quality report engagement reference",
    report?.deliveryEngagementId === "eng-1",
  );

  return { passed, failed };
}
