import { VENTURE_STATUS, type VentureStatus } from "../../constants/ventureStatus";
import {
  INITIATIVE_CLOSURE_OUTCOME,
  INITIATIVE_STATUS,
  type InitiativeClosureOutcome,
  type InitiativeStatus,
} from "../../constants/initiativeStatus";
import {
  DECISION_STATUS,
  DECISION_TYPE,
  type DecisionStatus,
  type DecisionType,
} from "../../constants/decisionStatus";
import {
  ATTRIBUTION_STATUS,
  type AttributionStatus,
} from "../../constants/attributionStatus";
import { MILESTONE_STATUS, type MilestoneStatus } from "../../constants/milestoneStatus";
import { domainFailOne, type DomainValidationFailure } from "../domainResult";

const VENTURE_STATUSES = new Set<string>(Object.values(VENTURE_STATUS));
const INITIATIVE_STATUSES = new Set<string>(Object.values(INITIATIVE_STATUS));
const INITIATIVE_OUTCOMES = new Set<string>(Object.values(INITIATIVE_CLOSURE_OUTCOME));
const DECISION_STATUSES = new Set<string>(Object.values(DECISION_STATUS));
const DECISION_TYPES = new Set<string>(Object.values(DECISION_TYPE));
const ATTRIBUTION_STATUSES = new Set<string>(Object.values(ATTRIBUTION_STATUS));
const MILESTONE_STATUSES = new Set<string>(Object.values(MILESTONE_STATUS));

export type ParsedStatusResult<T> = { ok: true; value: T } | DomainValidationFailure;

export function isKnownVentureStatus(value: unknown): value is VentureStatus {
  return typeof value === "string" && VENTURE_STATUSES.has(value);
}

export function isKnownInitiativeStatus(value: unknown): value is InitiativeStatus {
  return typeof value === "string" && INITIATIVE_STATUSES.has(value);
}

export function isKnownInitiativeClosureOutcome(
  value: unknown,
): value is InitiativeClosureOutcome {
  return typeof value === "string" && INITIATIVE_OUTCOMES.has(value);
}

export function isKnownDecisionStatus(value: unknown): value is DecisionStatus {
  return typeof value === "string" && DECISION_STATUSES.has(value);
}

export function isKnownDecisionType(value: unknown): value is DecisionType {
  return typeof value === "string" && DECISION_TYPES.has(value);
}

export function isKnownAttributionStatus(value: unknown): value is AttributionStatus {
  return typeof value === "string" && ATTRIBUTION_STATUSES.has(value);
}

export function isKnownMilestoneStatus(value: unknown): value is MilestoneStatus {
  return typeof value === "string" && MILESTONE_STATUSES.has(value);
}

export function parseKnownVentureStatus(value: unknown): ParsedStatusResult<VentureStatus> {
  if (!isKnownVentureStatus(value)) {
    return domainFailOne("VENTURE_INVALID_STATUS", `Unknown venture status: ${String(value)}`);
  }
  return { ok: true, value };
}

export function parseKnownInitiativeStatus(value: unknown): ParsedStatusResult<InitiativeStatus> {
  if (!isKnownInitiativeStatus(value)) {
    return domainFailOne("INITIATIVE_INVALID_STATUS", `Unknown initiative status: ${String(value)}`);
  }
  return { ok: true, value };
}

export function parseKnownDecisionStatus(value: unknown): ParsedStatusResult<DecisionStatus> {
  if (!isKnownDecisionStatus(value)) {
    return domainFailOne("DECISION_INVALID_STATUS", `Unknown decision status: ${String(value)}`);
  }
  return { ok: true, value };
}

export function parseKnownDecisionType(value: unknown): ParsedStatusResult<DecisionType> {
  if (!isKnownDecisionType(value)) {
    return domainFailOne("DECISION_INVALID_TYPE", `Unknown decision type: ${String(value)}`);
  }
  return { ok: true, value };
}

export function parseKnownInitiativeClosureOutcome(
  value: unknown,
): ParsedStatusResult<InitiativeClosureOutcome> {
  if (!isKnownInitiativeClosureOutcome(value)) {
    return domainFailOne(
      "INITIATIVE_INVALID_CLOSURE_OUTCOME",
      `Unknown initiative closure outcome: ${String(value)}`,
    );
  }
  return { ok: true, value };
}

export function parseKnownAttributionStatus(value: unknown): ParsedStatusResult<AttributionStatus> {
  if (!isKnownAttributionStatus(value)) {
    return domainFailOne("ATTRIBUTION_INVALID_STATUS", `Unknown attribution status: ${String(value)}`);
  }
  return { ok: true, value };
}

export function parseKnownMilestoneStatus(value: unknown): ParsedStatusResult<MilestoneStatus> {
  if (!isKnownMilestoneStatus(value)) {
    return domainFailOne("MILESTONE_INVALID_STATUS", `Unknown milestone status: ${String(value)}`);
  }
  return { ok: true, value };
}
