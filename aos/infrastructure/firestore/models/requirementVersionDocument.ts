import type { RequirementVersion } from "../../../domain/requirements/entities/requirementVersion";
import type firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";
import { epochMsToTimestamp, requireTimestampMs } from "../timestamp";

export interface RequirementVersionDocument {
  companyId: string;
  engagementId: string;
  requirementSetId: string;
  versionNumber: number;
  publishedAt: firebase.firestore.Timestamp;
  publishedByUserId: string;
  snapshot: RequirementVersion["snapshot"];
  supersedesVersionId?: string;
}

export function requirementVersionToFirestore(version: RequirementVersion): RequirementVersionDocument {
  return deepOmitUndefinedFields({
    companyId: version.companyId,
    engagementId: version.engagementId,
    requirementSetId: version.requirementSetId,
    versionNumber: version.versionNumber,
    publishedAt: epochMsToTimestamp(version.publishedAt),
    publishedByUserId: version.publishedByUserId,
    snapshot: {
      title: version.snapshot.title,
      items: version.snapshot.items.map((item) => ({ ...item })),
      attachmentRefs: version.snapshot.attachmentRefs
        ? [...version.snapshot.attachmentRefs]
        : undefined,
    },
    supersedesVersionId: version.supersedesVersionId,
  }) as RequirementVersionDocument;
}

export function requirementVersionFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): RequirementVersion | null {
  if (!data || typeof data.companyId !== "string") return null;
  const publishedAt = requireTimestampMs(data.publishedAt, "publishedAt");
  if (publishedAt === null) return null;

  const snapshot = data.snapshot as RequirementVersion["snapshot"] | undefined;
  if (!snapshot || typeof snapshot.title !== "string" || !Array.isArray(snapshot.items)) {
    return null;
  }

  return {
    id,
    companyId: data.companyId,
    engagementId: String(data.engagementId ?? ""),
    requirementSetId: String(data.requirementSetId ?? ""),
    versionNumber: Number(data.versionNumber ?? 0),
    publishedAt,
    publishedByUserId: String(data.publishedByUserId ?? ""),
    snapshot: {
      title: snapshot.title,
      items: snapshot.items.map((item) => ({ ...item })),
      attachmentRefs: snapshot.attachmentRefs,
    },
    supersedesVersionId:
      typeof data.supersedesVersionId === "string" ? data.supersedesVersionId : undefined,
  };
}
