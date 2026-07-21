import type { PromptVersion } from "../../../domain/prompt/entities/promptVersion";
import type firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";
import { epochMsToTimestamp, requireTimestampMs } from "../timestamp";

export interface PromptVersionDocument {
  companyId: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  requirementVersionId: string;
  versionNumber: number;
  publishedAt: firebase.firestore.Timestamp;
  publishedByUserId: string;
  snapshot: PromptVersion["snapshot"];
  supersedesVersionId?: string;
}

export function promptVersionToFirestore(version: PromptVersion): PromptVersionDocument {
  return deepOmitUndefinedFields({
    companyId: version.companyId,
    engagementId: version.engagementId,
    promptPackId: version.promptPackId,
    promptArtifactId: version.promptArtifactId,
    requirementVersionId: version.requirementVersionId,
    versionNumber: version.versionNumber,
    publishedAt: epochMsToTimestamp(version.publishedAt),
    publishedByUserId: version.publishedByUserId,
    snapshot: { ...version.snapshot },
    supersedesVersionId: version.supersedesVersionId,
  }) as PromptVersionDocument;
}

export function promptVersionFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): PromptVersion | null {
  if (!data || typeof data.companyId !== "string") return null;
  const publishedAt = requireTimestampMs(data.publishedAt, "publishedAt");
  if (publishedAt === null) return null;

  const snapshot = data.snapshot as PromptVersion["snapshot"] | undefined;
  if (!snapshot || typeof snapshot.title !== "string" || typeof snapshot.body !== "string") {
    return null;
  }

  return {
    id,
    companyId: data.companyId,
    engagementId: String(data.engagementId ?? ""),
    promptPackId: String(data.promptPackId ?? ""),
    promptArtifactId: String(data.promptArtifactId ?? ""),
    requirementVersionId: String(data.requirementVersionId ?? ""),
    versionNumber: Number(data.versionNumber ?? 0),
    publishedAt,
    publishedByUserId: String(data.publishedByUserId ?? ""),
    snapshot: {
      title: snapshot.title,
      body: snapshot.body,
      acceptanceCriteria: snapshot.acceptanceCriteria,
      rubricVersionId: snapshot.rubricVersionId,
    },
    supersedesVersionId:
      typeof data.supersedesVersionId === "string" ? data.supersedesVersionId : undefined,
  };
}
