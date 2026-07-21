import type { CompanyId, EpochMs, UserId } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import type { RequirementItem } from "./requirementItem";
import { freezePublishedRecord } from "../../versioning/versionResult";

export interface RequirementVersionSnapshot {
  title: string;
  items: readonly RequirementItem[];
  attachmentRefs?: readonly string[];
}

/** Immutable published requirement snapshot — no domain mutation API. */
export interface RequirementVersion {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly requirementSetId: string;
  readonly versionNumber: number;
  readonly publishedAt: EpochMs;
  readonly publishedByUserId: UserId;
  readonly snapshot: RequirementVersionSnapshot;
  readonly supersedesVersionId?: string;
}

export interface PublishRequirementVersionInput {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  requirementSetId: string;
  versionNumber: number;
  publishedAt: EpochMs;
  publishedByUserId: UserId;
  snapshot: RequirementVersionSnapshot;
  supersedesVersionId?: string;
}

export function createRequirementVersion(input: PublishRequirementVersionInput): RequirementVersion {
  return freezePublishedRecord({
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    requirementSetId: input.requirementSetId,
    versionNumber: input.versionNumber,
    publishedAt: input.publishedAt,
    publishedByUserId: input.publishedByUserId,
    snapshot: {
      title: input.snapshot.title,
      items: [...input.snapshot.items],
      attachmentRefs: input.snapshot.attachmentRefs ? [...input.snapshot.attachmentRefs] : undefined,
    },
    supersedesVersionId: input.supersedesVersionId,
  });
}

/** Reject attempts to mutate published versions at domain boundary. */
export function assertRequirementVersionImmutable(
  _version: RequirementVersion,
): void {
  if (!Object.isFrozen(_version)) {
    throw new Error("RequirementVersion must be frozen before use");
  }
}
