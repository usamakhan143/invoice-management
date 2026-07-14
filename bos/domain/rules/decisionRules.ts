import { DECISION_STATUS, DECISION_TYPE } from "../../constants/decisionStatus";
import type { BosDecision, CreateBosDecisionInput, UpdateBosDecisionInput } from "../entities/decision";
import type { BosInitiative } from "../entities/initiative";
import type { BosVenture } from "../entities/venture";
import type { DecisionStatus } from "../../constants/decisionStatus";
import { isDecisionTransitionAllowed } from "../lifecycle/decisionLifecycle";
import { DECISION_DELETE_FORBIDDEN } from "../lifecycle/decisionLifecycle";
import { parseKnownDecisionType } from "../guards/statusGuards";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";
import { TERMINAL_DECISION_STATUSES } from "../../constants/decisionStatus";

export function validateCreateDecision(input: CreateBosDecisionInput): DomainResult {
  if (!input.title?.trim()) {
    return domainFailOne("DECISION_TITLE_REQUIRED", "Decision title is required.");
  }
  if (!input.decision?.trim()) {
    return domainFailOne("DECISION_OUTCOME_REQUIRED", "Decision outcome text is required.");
  }
  const typeResult = parseKnownDecisionType(input.decisionType);
  if (!typeResult.ok) {
    return typeResult;
  }
  if (!input.ventureId?.trim() && !input.initiativeId?.trim()) {
    return domainFailOne(
      "DECISION_SCOPE_REQUIRED",
      "Decision must link to at least one venture or initiative.",
    );
  }
  if (input.decidedAt === undefined || !Number.isFinite(input.decidedAt)) {
    return domainFailOne("DECISION_DATE_REQUIRED", "Decision date is required.");
  }
  return domainOk();
}

export function validateDecisionEntityLinks(
  input: CreateBosDecisionInput,
  context: {
    venture?: BosVenture | null;
    initiative?: BosInitiative | null;
  },
): DomainResult {
  if (input.ventureId) {
    if (!context.venture) {
      return domainFailOne("DECISION_VENTURE_NOT_FOUND", "Linked venture was not found.");
    }
    if (context.venture.companyId !== input.companyId) {
      return domainFailOne("DECISION_SCOPE_MISMATCH", "Venture does not belong to this company.");
    }
  }

  if (input.initiativeId) {
    if (!context.initiative) {
      return domainFailOne("DECISION_INITIATIVE_NOT_FOUND", "Linked initiative was not found.");
    }
    if (context.initiative.companyId !== input.companyId) {
      return domainFailOne("DECISION_SCOPE_MISMATCH", "Initiative does not belong to this company.");
    }
    if (input.ventureId && context.initiative.ventureId !== input.ventureId) {
      return domainFailOne(
        "DECISION_SCOPE_MISMATCH",
        "Initiative does not belong to the specified venture.",
      );
    }
  }

  return domainOk();
}

export function validateUpdateDecision(
  decision: BosDecision,
  input: UpdateBosDecisionInput,
): DomainResult {
  if (TERMINAL_DECISION_STATUSES.includes(decision.status)) {
    return domainFailOne(
      "DECISION_INVALID_TRANSITION",
      `Cannot update a ${decision.status} decision.`,
    );
  }
  if (input.title !== undefined && !input.title.trim()) {
    return domainFailOne("DECISION_TITLE_REQUIRED", "Decision title cannot be empty.");
  }
  if (input.decision !== undefined && !input.decision.trim()) {
    return domainFailOne("DECISION_OUTCOME_REQUIRED", "Decision outcome text cannot be empty.");
  }
  if (input.decisionType !== undefined) {
    const typeResult = parseKnownDecisionType(input.decisionType);
    if (!typeResult.ok) {
      return typeResult;
    }
  }
  if (input.decidedAt !== undefined && !Number.isFinite(input.decidedAt)) {
    return domainFailOne("DECISION_DATE_INVALID", "Decision date is invalid.");
  }
  return domainOk();
}

export function validateDecisionStatusTransition(
  decision: BosDecision,
  nextStatus: DecisionStatus,
): DomainResult {
  if (!isDecisionTransitionAllowed(decision.status, nextStatus)) {
    return domainFailOne(
      "DECISION_INVALID_TRANSITION",
      `Cannot transition decision from ${decision.status} to ${nextStatus}.`,
    );
  }
  return domainOk();
}

export function assertDecisionNotDeleted(): DomainResult {
  if (DECISION_DELETE_FORBIDDEN) {
    return domainFailOne(
      "DECISION_DELETE_FORBIDDEN",
      "Decisions cannot be deleted; supersede or revoke instead (Doc 11).",
    );
  }
  return domainOk();
}

export function isDecisionOpen(decision: BosDecision): boolean {
  return (
    decision.status === DECISION_STATUS.PROPOSED ||
    decision.status === DECISION_STATUS.APPROVED ||
    decision.status === DECISION_STATUS.ACTIVE
  );
}
