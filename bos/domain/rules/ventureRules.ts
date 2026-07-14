import { ATTRIBUTION_ELIGIBLE_INITIATIVE_STATUSES } from "../../constants/initiativeStatus";
import { TERMINAL_VENTURE_STATUSES, VENTURE_STATUS } from "../../constants/ventureStatus";
import type { BosInitiative } from "../entities/initiative";
import type { CreateBosVentureInput, BosVenture, UpdateBosVentureInput } from "../entities/venture";
import type { VentureStatus } from "../../constants/ventureStatus";
import { isInvalidVentureTransition, isVentureTransitionAllowed } from "../lifecycle/ventureLifecycle";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";

export function validateCreateVenture(input: CreateBosVentureInput): DomainResult {
  if (!input.name?.trim()) {
    return domainFailOne("VENTURE_NAME_REQUIRED", "Venture name is required.");
  }
  if (!input.ownerUserId?.trim()) {
    return domainFailOne("VENTURE_OWNER_REQUIRED", "Venture owner is required.");
  }
  return domainOk();
}

export function validateUpdateVenture(input: UpdateBosVentureInput): DomainResult {
  if (input.name !== undefined && !input.name.trim()) {
    return domainFailOne("VENTURE_NAME_REQUIRED", "Venture name cannot be empty.");
  }
  if (input.ownerUserId !== undefined && !input.ownerUserId.trim()) {
    return domainFailOne("VENTURE_OWNER_REQUIRED", "Venture owner cannot be empty.");
  }
  return domainOk();
}

export function validateVentureArchivePrerequisites(options: {
  openInitiativeCount: number;
}): DomainResult {
  if (options.openInitiativeCount > 0) {
    return domainFailOne(
      "VENTURE_ARCHIVE_BLOCKED",
      "All initiatives must be closed before a venture can be archived (Doc 11).",
    );
  }
  return domainOk();
}

export function validateVentureStatusTransition(
  venture: BosVenture,
  nextStatus: VentureStatus,
): DomainResult {
  if (isInvalidVentureTransition(venture.status, nextStatus)) {
    return domainFailOne(
      "VENTURE_INVALID_TRANSITION",
      `Cannot transition venture from ${venture.status} to ${nextStatus}.`,
    );
  }
  if (!isVentureTransitionAllowed(venture.status, nextStatus)) {
    return domainFailOne(
      "VENTURE_INVALID_TRANSITION",
      `Transition from ${venture.status} to ${nextStatus} is not allowed.`,
    );
  }
  if (nextStatus === VENTURE_STATUS.ARCHIVED && venture.status !== VENTURE_STATUS.WINDING_DOWN) {
    return domainFailOne(
      "VENTURE_ARCHIVE_BLOCKED",
      "Venture must be winding down before archive (Doc 11).",
    );
  }
  return domainOk();
}

export function canVentureAcceptNewInitiatives(venture: BosVenture): boolean {
  return !TERMINAL_VENTURE_STATUSES.includes(venture.status);
}

export function canInitiativeAcceptAttribution(initiative: BosInitiative): boolean {
  return ATTRIBUTION_ELIGIBLE_INITIATIVE_STATUSES.includes(initiative.status);
}
