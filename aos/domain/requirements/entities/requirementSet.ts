import type { CompanyId, EpochMs } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import type { RequirementItem } from "./requirementItem";

export type RequirementSetStatus = "draft" | "in_review" | "approved" | "superseded";

/** Mutable requirement head — drafts edit here; publish creates RequirementVersion. */
export interface RequirementSet {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  status: RequirementSetStatus;
  title: string;
  items: RequirementItem[];
  aiGenerated: boolean;
  approvalNote?: string;
  approvedAt?: EpochMs;
  updatedAt: EpochMs;
  /** Mirrors currentApprovedVersionNumber for D4 UI compatibility. */
  version: number;
  currentApprovedVersionId?: string;
  currentApprovedVersionNumber?: number;
  supersedesSetId?: string;
}

export function createRequirementSetHead(input: {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  title: string;
  items: RequirementItem[];
  aiGenerated: boolean;
  updatedAt: EpochMs;
  supersedesSetId?: string;
}): RequirementSet {
  return {
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    status: "draft",
    title: input.title,
    items: input.items,
    aiGenerated: input.aiGenerated,
    updatedAt: input.updatedAt,
    version: 0,
    supersedesSetId: input.supersedesSetId,
  };
}

export function isRequirementSetDraftMutable(set: RequirementSet): boolean {
  return set.status === "draft" || set.status === "in_review";
}
