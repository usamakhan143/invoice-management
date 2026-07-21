import type { CompanyId, EpochMs, UserId } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import { freezePublishedRecord } from "../../versioning/versionResult";

export type CursorRevisionStatus = "open" | "resolved" | "limit_reached";

/** Append-only revision link after failed cursor/evaluation (ADR-006). */
export interface CursorRevision {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly cursorSessionId: string;
  readonly originalPromptVersionId: string;
  readonly revisionPromptVersionId?: string;
  readonly status: CursorRevisionStatus;
  readonly createdAt: EpochMs;
  readonly createdByUserId: UserId;
  readonly resolvedAt?: EpochMs;
}

export function createCursorRevision(input: {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  cursorSessionId: string;
  originalPromptVersionId: string;
  createdAt: EpochMs;
  createdByUserId: UserId;
}): CursorRevision {
  return freezePublishedRecord({
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    cursorSessionId: input.cursorSessionId,
    originalPromptVersionId: input.originalPromptVersionId,
    status: "open",
    createdAt: input.createdAt,
    createdByUserId: input.createdByUserId,
  });
}
