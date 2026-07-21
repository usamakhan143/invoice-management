import type { CompanyId, EpochMs, UserId } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";

export type CursorSessionStatus =
  | "active"
  | "awaiting_capture"
  | "captured"
  | "submitted"
  | "passed"
  | "failed"
  | "abandoned";

/** Live cursor execution record — frozen only after finalization. */
export interface CursorSession {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  promptPackId: string;
  promptArtifactId: string;
  promptVersionId: string;
  executorUserId: UserId;
  status: CursorSessionStatus;
  startedAt: EpochMs;
  captureSummary?: string;
  capturedAt?: EpochMs;
  finalizedAt?: EpochMs;
}

export function createCursorSession(input: {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  promptPackId: string;
  promptArtifactId: string;
  promptVersionId: string;
  executorUserId: UserId;
  startedAt: EpochMs;
}): CursorSession {
  return {
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    promptPackId: input.promptPackId,
    promptArtifactId: input.promptArtifactId,
    promptVersionId: input.promptVersionId,
    executorUserId: input.executorUserId,
    status: "active",
    startedAt: input.startedAt,
  };
}

export function isCursorSessionFinalized(session: CursorSession): boolean {
  return session.status === "passed" || session.status === "failed" || session.status === "submitted";
}
