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
import {
  requirementVersionFromFirestore,
  requirementVersionToFirestore,
} from "../models/requirementVersionDocument";
import {
  promptVersionFromFirestore,
  promptVersionToFirestore,
} from "../models/promptVersionDocument";
import {
  cursorSessionFromFirestore,
  cursorSessionToFirestore,
} from "../models/cursorSessionDocument";
import {
  cursorRevisionFromFirestore,
  cursorRevisionToFirestore,
} from "../models/cursorRevisionDocument";
import {
  evaluationFromFirestore,
  evaluationToFirestore,
} from "../models/evaluationDocument";
import { createRequirementVersion } from "../../../domain/requirements/entities/requirementVersion";
import { createPromptVersion } from "../../../domain/prompt/entities/promptVersion";
import { createCursorSession } from "../../../domain/cursor/entities/cursorSession";
import { createCursorRevision } from "../../../domain/cursor/entities/cursorRevision";
import {
  createEvaluationDraft,
  freezeEvaluation,
} from "../../../domain/evaluation/entities/evaluation";
import { DEFAULT_DELIVERY_RUBRIC } from "../../../domain/evaluation/entities/evaluationRubric";
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

  const reqVersion = createRequirementVersion({
    id: "co1__set1__v1",
    companyId: "company-1",
    engagementId: "eng-1",
    requirementSetId: "set1",
    versionNumber: 1,
    publishedAt: nowMs,
    publishedByUserId: "user-1",
    snapshot: { title: "Req", items: [{ id: "r1", title: "T", description: "D" }] },
  });
  const reqDoc = requirementVersionToFirestore(reqVersion);
  const reqRoundTrip = requirementVersionFromFirestore(reqVersion.id, reqDoc);
  check("requirement version round-trip title", reqRoundTrip?.snapshot.title === "Req");

  const promptVersion = createPromptVersion({
    id: "co1__art1__v1",
    companyId: "company-1",
    engagementId: "eng-1",
    promptPackId: "pack1",
    promptArtifactId: "art1",
    requirementVersionId: reqVersion.id,
    versionNumber: 1,
    publishedAt: nowMs,
    publishedByUserId: "user-1",
    snapshot: { title: "Prompt", body: "Body" },
  });
  const promptDoc = promptVersionToFirestore(promptVersion);
  check(
    "prompt version round-trip requirement ref",
    promptVersionFromFirestore(promptVersion.id, promptDoc)?.requirementVersionId === reqVersion.id,
  );

  const session = createCursorSession({
    id: "cursor-1",
    companyId: "company-1",
    engagementId: "eng-1",
    promptPackId: "pack1",
    promptArtifactId: "art1",
    promptVersionId: promptVersion.id,
    executorUserId: "user-1",
    startedAt: nowMs,
  });
  check(
    "cursor session round-trip promptVersionId",
    cursorSessionFromFirestore(session.id, cursorSessionToFirestore(session))?.promptVersionId ===
      promptVersion.id,
  );

  const revision = createCursorRevision({
    id: "rev-1",
    companyId: "company-1",
    engagementId: "eng-1",
    cursorSessionId: session.id,
    originalPromptVersionId: promptVersion.id,
    createdAt: nowMs,
    createdByUserId: "user-1",
  });
  check(
    "cursor revision round-trip session ref",
    cursorRevisionFromFirestore(revision.id, cursorRevisionToFirestore(revision))?.cursorSessionId ===
      session.id,
  );

  const evalDraft = createEvaluationDraft({
    id: "eval-1",
    companyId: "company-1",
    engagementId: "eng-1",
    cursorSessionId: session.id,
    promptVersionId: promptVersion.id,
    requirementVersionId: reqVersion.id,
    rubric: DEFAULT_DELIVERY_RUBRIC,
    criteria: [{ id: "c1", label: "C", passed: true, score: 90 }],
    scorePercent: 90,
    passed: true,
    createdAt: nowMs,
  });
  const evalConfirmed = freezeEvaluation(evalDraft, {
    status: "confirmed",
    confirmedAt: nowMs,
    confirmedByUserId: "user-1",
  });
  check(
    "evaluation round-trip rubric snapshot",
    evaluationFromFirestore(evalConfirmed.id, evaluationToFirestore(evalConfirmed))?.rubricSnapshot
      .name === DEFAULT_DELIVERY_RUBRIC.name,
  );

  return { passed, failed };
}
