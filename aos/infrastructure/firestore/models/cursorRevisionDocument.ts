import type { CursorRevision } from "../../../domain/cursor/entities/cursorRevision";
import type firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";
import { epochMsToTimestamp, requireTimestampMs, timestampToEpochMs } from "../timestamp";

export interface CursorRevisionDocument {
  companyId: string;
  engagementId: string;
  cursorSessionId: string;
  originalPromptVersionId: string;
  revisionPromptVersionId?: string;
  status: CursorRevision["status"];
  createdAt: firebase.firestore.Timestamp;
  createdByUserId: string;
  resolvedAt?: firebase.firestore.Timestamp;
}

export function cursorRevisionToFirestore(revision: CursorRevision): CursorRevisionDocument {
  return deepOmitUndefinedFields({
    companyId: revision.companyId,
    engagementId: revision.engagementId,
    cursorSessionId: revision.cursorSessionId,
    originalPromptVersionId: revision.originalPromptVersionId,
    revisionPromptVersionId: revision.revisionPromptVersionId,
    status: revision.status,
    createdAt: epochMsToTimestamp(revision.createdAt),
    createdByUserId: revision.createdByUserId,
    resolvedAt: revision.resolvedAt != null ? epochMsToTimestamp(revision.resolvedAt) : undefined,
  }) as CursorRevisionDocument;
}

export function cursorRevisionFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): CursorRevision | null {
  if (!data || typeof data.companyId !== "string") return null;
  const createdAt = requireTimestampMs(data.createdAt, "createdAt");
  if (createdAt === null) return null;

  return {
    id,
    companyId: data.companyId,
    engagementId: String(data.engagementId ?? ""),
    cursorSessionId: String(data.cursorSessionId ?? ""),
    originalPromptVersionId: String(data.originalPromptVersionId ?? ""),
    revisionPromptVersionId:
      typeof data.revisionPromptVersionId === "string" ? data.revisionPromptVersionId : undefined,
    status: data.status as CursorRevision["status"],
    createdAt,
    createdByUserId: String(data.createdByUserId ?? ""),
    resolvedAt: timestampToEpochMs(data.resolvedAt),
  };
}
