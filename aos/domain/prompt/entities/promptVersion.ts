import type { CompanyId, EpochMs, UserId } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import { freezePublishedRecord } from "../../versioning/versionResult";

export interface PromptVersionSnapshot {
  title: string;
  body: string;
  acceptanceCriteria?: string;
  rubricVersionId?: string;
}

/** Immutable published prompt artifact snapshot. */
export interface PromptVersion {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly promptPackId: string;
  readonly promptArtifactId: string;
  readonly requirementVersionId: string;
  readonly versionNumber: number;
  readonly publishedAt: EpochMs;
  readonly publishedByUserId: UserId;
  readonly snapshot: PromptVersionSnapshot;
  readonly supersedesVersionId?: string;
}

export function createPromptVersion(input: {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  promptPackId: string;
  promptArtifactId: string;
  requirementVersionId: string;
  versionNumber: number;
  publishedAt: EpochMs;
  publishedByUserId: UserId;
  snapshot: PromptVersionSnapshot;
  supersedesVersionId?: string;
}): PromptVersion {
  return freezePublishedRecord({
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    promptPackId: input.promptPackId,
    promptArtifactId: input.promptArtifactId,
    requirementVersionId: input.requirementVersionId,
    versionNumber: input.versionNumber,
    publishedAt: input.publishedAt,
    publishedByUserId: input.publishedByUserId,
    snapshot: { ...input.snapshot },
    supersedesVersionId: input.supersedesVersionId,
  });
}

export function assertPromptVersionImmutable(version: PromptVersion): void {
  if (!Object.isFrozen(version)) {
    throw new Error("PromptVersion must be frozen before use");
  }
}
