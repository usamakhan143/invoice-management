import {
  ATTRIBUTION_MAX_TOTAL_PERCENT,
  SIDECAR_LAW_ERP_COLLECTIONS,
} from "../../constants";
import { ATTRIBUTION_STATUS } from "../../constants/attributionStatus";
import type { BosAttribution, CreateBosAttributionInput } from "../entities/attribution";
import type { BosInitiative } from "../entities/initiative";
import { canInitiativeAcceptAttribution } from "./ventureRules";
import { ATTRIBUTION_DELETE_FORBIDDEN } from "../lifecycle/attributionLifecycle";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";

export function validateCreateAttribution(
  initiative: BosInitiative,
  input: CreateBosAttributionInput,
): DomainResult {
  if (!canInitiativeAcceptAttribution(initiative)) {
    return domainFailOne(
      "ATTRIBUTION_INITIATIVE_NOT_ELIGIBLE",
      "Attributions are allowed only for active or paused initiatives (Doc 11).",
    );
  }

  if (input.allocationPercent < 0 || input.allocationPercent > ATTRIBUTION_MAX_TOTAL_PERCENT) {
    return domainFailOne(
      "ATTRIBUTION_ALLOCATION_INVALID",
      `Allocation must be between 0 and ${ATTRIBUTION_MAX_TOTAL_PERCENT}.`,
    );
  }

  if (!input.sourceId?.trim()) {
    return domainFailOne("ATTRIBUTION_SIDECAR_VIOLATION", "Attribution sourceId is required.");
  }

  return domainOk();
}

/** Doc 11 §5 — sum of split % per source (expense), not per initiative. */
export function validateAttributionSplitTotal(
  existingActiveForSource: readonly BosAttribution[],
  newAllocationPercent: number,
): DomainResult {
  const total =
    existingActiveForSource
      .filter((a) => a.status === ATTRIBUTION_STATUS.ACTIVE)
      .reduce((sum, a) => sum + a.allocationPercent, 0) + newAllocationPercent;

  if (total > ATTRIBUTION_MAX_TOTAL_PERCENT) {
    return domainFailOne(
      "ATTRIBUTION_SPLIT_EXCEEDS_MAX",
      `Total active allocation for this source would exceed ${ATTRIBUTION_MAX_TOTAL_PERCENT}% (Doc 11).`,
    );
  }
  return domainOk();
}

export function assertAttributionSidecarLaw(
  targetCollection: string,
): DomainResult {
  if ((SIDECAR_LAW_ERP_COLLECTIONS as readonly string[]).includes(targetCollection)) {
    return domainFailOne(
      "ATTRIBUTION_SIDECAR_VIOLATION",
      `BOS must not write fields to ERP collection "${targetCollection}". Use BosAttribution sidecar only.`,
    );
  }
  return domainOk();
}

export function assertAttributionNotDeleted(): DomainResult {
  if (ATTRIBUTION_DELETE_FORBIDDEN) {
    return domainFailOne(
      "ATTRIBUTION_DELETE_FORBIDDEN",
      "Attributions cannot be deleted; void or supersede instead (Doc 11).",
    );
  }
  return domainOk();
}

export function validateNoDuplicateActiveAttribution(
  existingActive: readonly BosAttribution[],
): DomainResult {
  if (existingActive.some((a) => a.status === ATTRIBUTION_STATUS.ACTIVE)) {
    return domainFailOne(
      "ATTRIBUTION_DUPLICATE",
      "An active attribution already exists for this ERP record (Doc 07 R-009).",
    );
  }
  return domainOk();
}
