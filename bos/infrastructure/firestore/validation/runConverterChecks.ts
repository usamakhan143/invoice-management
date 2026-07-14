/**
 * Pure converter / domain validation checks (no Firestore).
 * Run: npm run bos:validate
 */

import { VENTURE_STATUS } from "../../../constants/ventureStatus";
import { INITIATIVE_STATUS, INITIATIVE_CLOSURE_OUTCOME } from "../../../constants/initiativeStatus";
import { DECISION_STATUS, DECISION_TYPE } from "../../../constants/decisionStatus";
import { ventureFromFirestore, ventureToFirestore } from "../models/ventureDocument";
import { initiativeFromFirestore, initiativeToFirestore } from "../models/initiativeDocument";
import { decisionFromFirestore, decisionToFirestore } from "../models/decisionDocument";
import { validateCreateVenture } from "../../../domain/rules/ventureRules";
import { validateCreateInitiative } from "../../../domain/rules/initiativeRules";
import { validateCreateDecision } from "../../../domain/rules/decisionRules";
import { validateCreateMilestone, validateCompleteMilestone } from "../../../domain/rules/milestoneRules";
import { MILESTONE_EVIDENCE_TYPE } from "../../../constants/milestoneEvidenceType";
import { MILESTONE_RESULT } from "../../../constants/milestoneResult";
import { MILESTONE_DELAY_REASON } from "../../../constants/milestoneDelayReason";
import { MILESTONE_COMPLETION_NEXT_ACTION } from "../../../constants/milestoneCompletionNextAction";
import type { BosMilestone } from "../../../domain/entities/milestone";
import { validateCreateMilestoneTemplate } from "../../../domain/rules/milestoneTemplateRules";
import { MILESTONE_STATUS } from "../../../constants/milestoneStatus";
import { MILESTONE_DURATION_UNIT } from "../../../constants/milestoneDurationUnit";
import { MILESTONE_BUSINESS_IMPACT } from "../../../constants/milestoneBusinessImpact";
import { MILESTONE_RISK_LEVEL } from "../../../constants/milestoneRiskLevel";
import { formatMilestoneNumber, resolveNextMilestoneNumberIndex } from "../../../domain/milestoneNumbering";
import { MILESTONE_TEMPLATE_VISIBILITY } from "../../../constants/milestoneTemplateVisibility";
import { milestoneFromFirestore, milestoneToFirestore } from "../models/milestoneDocument";
import {
  milestoneTemplateFromFirestore,
  milestoneTemplateToFirestore,
} from "../models/milestoneTemplateDocument";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

export interface ConverterCheckResult {
  passed: number;
  failed: string[];
}

export function runBosConverterChecks(): ConverterCheckResult {
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
  const ventureDoc = ventureToFirestore({
    companyId: "company-1",
    name: "Test Venture",
    description: "Desc",
    status: VENTURE_STATUS.PLANNED,
    ownerUserId: "owner-1",
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const venture = ventureFromFirestore("v1", ventureDoc);
  check("venture round-trip name", venture?.name === "Test Venture");
  check("venture round-trip status", venture?.status === VENTURE_STATUS.PLANNED);
  check(
    "venture toFirestore omits undefined optional fields",
    !Object.values(ventureDoc).some((value) => value === undefined),
  );

  const initiativeDoc = initiativeToFirestore({
    companyId: "company-1",
    ventureId: "v1",
    name: "Initiative A",
    hypothesis: "We believe X",
    status: INITIATIVE_STATUS.DRAFT,
    budget: { amount: 1000, currency: "USD" },
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const initiative = initiativeFromFirestore("i1", initiativeDoc);
  check("initiative budget round-trip", initiative?.budget?.amount === 1000);
  check("initiative status round-trip", initiative?.status === INITIATIVE_STATUS.DRAFT);

  const decisionDoc = decisionToFirestore({
    companyId: "company-1",
    ventureId: "v1",
    initiativeId: "i1",
    title: "Increase budget",
    decision: "Approved 10% increase",
    decisionType: DECISION_TYPE.BUDGET,
    status: DECISION_STATUS.PROPOSED,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const decision = decisionFromFirestore("d1", decisionDoc);
  check("decision type round-trip", decision?.decisionType === DECISION_TYPE.BUDGET);

  check(
    "reject invalid venture status",
    ventureFromFirestore("bad", { companyId: "c", status: "invalid" }) === null,
  );

  check(
    "domain rejects empty venture name",
    !validateCreateVenture({
      companyId: "c1",
      name: "",
      ownerUserId: "o1",
      createdById: "u1",
    }).ok,
  );

  check(
    "domain rejects empty ventureId on initiative",
    !validateCreateInitiative({
      companyId: "c1",
      ventureId: "",
      name: "Valid",
      startDate: Date.parse("2026-07-01"),
      createdById: "u1",
    }).ok,
  );

  check(
    "domain rejects initiative without planned start date",
    !validateCreateInitiative({
      companyId: "c1",
      ventureId: "v1",
      name: "Valid",
      createdById: "u1",
    }).ok,
  );

  check(
    "domain rejects empty decision title",
    !validateCreateDecision({
      companyId: "c1",
      initiativeId: "i1",
      title: "",
      decision: "x",
      decisionType: DECISION_TYPE.STRATEGIC,
      decidedAt: Date.parse("2026-06-01"),
      createdById: "u1",
    }).ok,
  );

  check(
    "domain rejects decision without decision date",
    !validateCreateDecision({
      companyId: "c1",
      initiativeId: "i1",
      title: "Valid",
      decision: "x",
      decisionType: DECISION_TYPE.STRATEGIC,
      createdById: "u1",
    }).ok,
  );

  check(
    "closure outcome distinct from status",
    INITIATIVE_CLOSURE_OUTCOME.SUCCESS !== INITIATIVE_STATUS.CLOSED,
  );

  const milestoneDoc = milestoneToFirestore({
    companyId: "company-1",
    initiativeId: "i1",
    title: "Partnership Signed",
    sequence: 0,
    status: MILESTONE_STATUS.PLANNED,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const milestone = milestoneFromFirestore("m1", milestoneDoc);
  check("milestone round-trip title", milestone?.title === "Partnership Signed");
  check("milestone round-trip status", milestone?.status === MILESTONE_STATUS.PLANNED);

  const milestoneWithCriteria = milestoneToFirestore({
    companyId: "company-1",
    initiativeId: "i1",
    title: "CRM Configured",
    successCriteria: "CRM connected",
    phase: "Implementation",
    priority: "high",
    tags: ["Operations"],
    sequence: 1,
    status: MILESTONE_STATUS.PLANNED,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const milestoneFull = milestoneFromFirestore("m2", milestoneWithCriteria);
  check("milestone success criteria round-trip", milestoneFull?.successCriteria === "CRM connected");
  check("milestone phase round-trip", milestoneFull?.phase === "Implementation");
  check("milestone tags round-trip", milestoneFull?.tags?.[0] === "Operations");

  const milestoneV1 = milestoneToFirestore({
    companyId: "company-1",
    initiativeId: "i1",
    milestoneNumber: "M-001",
    milestoneNumberIndex: 1,
    title: "Campaign Launch",
    milestoneType: "Campaign",
    businessImpact: MILESTONE_BUSINESS_IMPACT.HIGH,
    riskLevel: MILESTONE_RISK_LEVEL.MEDIUM,
    completionNotes: "Campaign live on all channels",
    completedDate: now.toMillis(),
    estimatedDuration: 2,
    estimatedDurationUnit: MILESTONE_DURATION_UNIT.WEEKS,
    estimatedCostAmount: 5000,
    estimatedCostCurrency: "USD",
    sequence: 2,
    status: MILESTONE_STATUS.PLANNED,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const milestoneV1Parsed = milestoneFromFirestore("m3", milestoneV1);
  check("milestone v1 number round-trip", milestoneV1Parsed?.milestoneNumber === "M-001");
  check("milestone v1 type round-trip", milestoneV1Parsed?.milestoneType === "Campaign");
  check(
    "milestone v1 duration round-trip",
    milestoneV1Parsed?.estimatedDuration === 2 &&
      milestoneV1Parsed?.estimatedDurationUnit === MILESTONE_DURATION_UNIT.WEEKS,
  );
  check(
    "milestone v1 cost round-trip",
    milestoneV1Parsed?.estimatedCostAmount === 5000 &&
      milestoneV1Parsed?.estimatedCostCurrency === "USD",
  );
  check(
    "milestone v1 business impact round-trip",
    milestoneV1Parsed?.businessImpact === MILESTONE_BUSINESS_IMPACT.HIGH,
  );
  check("milestone risk level round-trip", milestoneV1Parsed?.riskLevel === MILESTONE_RISK_LEVEL.MEDIUM);
  check(
    "milestone completion notes round-trip",
    milestoneV1Parsed?.completionNotes === "Campaign live on all channels",
  );

  const milestoneExecution = milestoneToFirestore({
    companyId: "company-1",
    initiativeId: "i1",
    title: "Partnership Approved",
    sequence: 1,
    status: MILESTONE_STATUS.IN_PROGRESS,
    startedAt: now.toMillis(),
    startedNotes: "Kickoff call completed",
    startedByUserId: "user-1",
    lessonsLearned: "Align legal early",
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const milestoneExecutionParsed = milestoneFromFirestore("m4", milestoneExecution);
  check("milestone started notes round-trip", milestoneExecutionParsed?.startedNotes === "Kickoff call completed");
  check("milestone started by round-trip", milestoneExecutionParsed?.startedByUserId === "user-1");
  check("milestone lessons learned round-trip", milestoneExecutionParsed?.lessonsLearned === "Align legal early");

  const inProgressMilestone = {
    id: "m5",
    companyId: "company-1",
    initiativeId: "i1",
    title: "Launch",
    sequence: 1,
    status: MILESTONE_STATUS.IN_PROGRESS,
    startedAt: now.toMillis() - 86400000 * 3,
    plannedEndDate: now.toMillis() - 86400000,
    businessImpact: MILESTONE_BUSINESS_IMPACT.HIGH,
    completionRequirements: { decisionRequired: true, notesRequired: true },
    createdById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  } as BosMilestone;

  check(
    "completion rejects missing decision evidence",
    !validateCompleteMilestone(inProgressMilestone, {
      completedDate: now.toMillis(),
      completionNotes: "Done",
      milestoneResult: MILESTONE_RESULT.COMPLETED_SUCCESSFULLY,
      completionNextAction: MILESTONE_COMPLETION_NEXT_ACTION.NOTHING,
      evidence: [{ type: MILESTONE_EVIDENCE_TYPE.MANUAL, notes: "note" }],
      updatedById: "user-1",
    }).ok,
  );

  check(
    "completion accepts requirement evidence",
    validateCompleteMilestone(
      inProgressMilestone,
      {
        completedDate: now.toMillis(),
        completionNotes: "Signed",
        lessonsLearned: "Start legal earlier",
        milestoneResult: MILESTONE_RESULT.COMPLETED_SUCCESSFULLY,
        delayReason: MILESTONE_DELAY_REASON.INTERNAL,
        completionNextAction: MILESTONE_COMPLETION_NEXT_ACTION.NOTHING,
        evidence: [{ type: MILESTONE_EVIDENCE_TYPE.DECISION, sourceId: "dec-1" }],
        updatedById: "user-1",
      },
      { completedDateMaxMs: now.toMillis() },
    ).ok,
  );

  check(
    "milestone numbering resolves next index",
    resolveNextMilestoneNumberIndex([{ milestoneNumberIndex: 3 } as { milestoneNumberIndex: number }]) === 4,
  );
  check("milestone number format", formatMilestoneNumber(12) === "M-012");

  check(
    "domain rejects empty success criteria when provided",
    !validateCreateMilestone({
      companyId: "c1",
      initiativeId: "i1",
      title: "Valid",
      successCriteria: "   ",
      sequence: 0,
      createdById: "u1",
    }).ok,
  );

  const templateDoc = milestoneTemplateToFirestore({
    companyId: "company-1",
    name: "Client Acquisition",
    steps: [{ id: "s1", title: "Partnership Signed", sequence: 0 }],
    visibility: MILESTONE_TEMPLATE_VISIBILITY.COMPANY,
    ownerUserId: "user-1",
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now.toMillis(),
    updatedAt: now.toMillis(),
  });
  const template = milestoneTemplateFromFirestore("t1", templateDoc);
  check("milestone template round-trip", template?.name === "Client Acquisition");

  check(
    "domain rejects milestone without title",
    !validateCreateMilestone({
      companyId: "c1",
      initiativeId: "i1",
      title: "",
      sequence: 0,
      createdById: "u1",
    }).ok,
  );

  check(
    "domain rejects template without steps",
    !validateCreateMilestoneTemplate({
      companyId: "c1",
      name: "Empty",
      steps: [],
      visibility: MILESTONE_TEMPLATE_VISIBILITY.PRIVATE,
      ownerUserId: "u1",
      createdById: "u1",
    }).ok,
  );

  return { passed, failed };
}
