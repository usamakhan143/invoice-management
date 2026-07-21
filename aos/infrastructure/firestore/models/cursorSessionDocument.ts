import type { CursorSession } from "../../../domain/cursor/entities/cursorSession";
import type firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";
import { epochMsToTimestamp, requireTimestampMs, timestampToEpochMs } from "../timestamp";

export interface CursorSessionDocument {
  companyId: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  promptVersionId: string;
  executorUserId: string;
  status: CursorSession["status"];
  startedAt: firebase.firestore.Timestamp;
  captureSummary?: string;
  capturedAt?: firebase.firestore.Timestamp;
  finalizedAt?: firebase.firestore.Timestamp;
}

export function cursorSessionToFirestore(session: CursorSession): CursorSessionDocument {
  return deepOmitUndefinedFields({
    companyId: session.companyId,
    engagementId: session.engagementId,
    promptPackId: session.promptPackId,
    promptArtifactId: session.promptArtifactId,
    promptVersionId: session.promptVersionId,
    executorUserId: session.executorUserId,
    status: session.status,
    startedAt: epochMsToTimestamp(session.startedAt),
    captureSummary: session.captureSummary,
    capturedAt: session.capturedAt != null ? epochMsToTimestamp(session.capturedAt) : undefined,
    finalizedAt: session.finalizedAt != null ? epochMsToTimestamp(session.finalizedAt) : undefined,
  }) as CursorSessionDocument;
}

export function cursorSessionFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): CursorSession | null {
  if (!data || typeof data.companyId !== "string") return null;
  const startedAt = requireTimestampMs(data.startedAt, "startedAt");
  if (startedAt === null) return null;

  return {
    id,
    companyId: data.companyId,
    engagementId: String(data.engagementId ?? ""),
    promptPackId: String(data.promptPackId ?? ""),
    promptArtifactId: String(data.promptArtifactId ?? ""),
    promptVersionId: String(data.promptVersionId ?? ""),
    executorUserId: String(data.executorUserId ?? ""),
    status: data.status as CursorSession["status"],
    startedAt,
    captureSummary: typeof data.captureSummary === "string" ? data.captureSummary : undefined,
    capturedAt: timestampToEpochMs(data.capturedAt),
    finalizedAt: timestampToEpochMs(data.finalizedAt),
  };
}

export function isCursorSessionFinalizedStatus(status: CursorSession["status"]): boolean {
  return status === "passed" || status === "failed" || status === "submitted";
}
