import type { CompanyId, EpochMs } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";

export type PromptPackStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "in_execution"
  | "completed"
  | "archived";

/** Mutable prompt artifact head within a pack. */
export interface PromptArtifactHead {
  id: string;
  title: string;
  body: string;
  currentApprovedVersionId?: string;
  currentApprovedVersionNumber?: number;
}

/** Mutable prompt pack head — must reference published RequirementVersion. */
export interface PromptPack {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  packVersion: number;
  /** D4 UI alias — mirrors packVersion. */
  version: number;
  status: PromptPackStatus;
  title: string;
  requirementVersionId: string;
  artifacts: PromptArtifactHead[];
  aiGenerated: boolean;
  approvalNote?: string;
  approvedAt?: EpochMs;
  updatedAt: EpochMs;
  supersedesPackId?: string;
}

export function createPromptPackHead(input: {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  requirementVersionId: string;
  title: string;
  artifacts: PromptArtifactHead[];
  aiGenerated: boolean;
  updatedAt: EpochMs;
  packVersion?: number;
  supersedesPackId?: string;
}): PromptPack {
  return {
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    packVersion: input.packVersion ?? 1,
    version: input.packVersion ?? 1,
    status: "draft",
    title: input.title,
    requirementVersionId: input.requirementVersionId,
    artifacts: input.artifacts,
    aiGenerated: input.aiGenerated,
    updatedAt: input.updatedAt,
    supersedesPackId: input.supersedesPackId,
  };
}

export function isPromptPackDraftMutable(pack: PromptPack): boolean {
  return pack.status === "draft" || pack.status === "in_review";
}

export function archivePromptPack(pack: PromptPack, archivedAt: EpochMs): PromptPack {
  return { ...pack, status: "archived", updatedAt: archivedAt };
}
