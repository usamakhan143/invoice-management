import type { CompanyId, EpochMs, UserId } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import {
  assertMonotonicVersionNumber,
  assertSameCompany,
  versionFailOne,
  versionOk,
  type VersionResult,
} from "../../versioning/versionResult";
import type { RequirementSet } from "../entities/requirementSet";
import { isRequirementSetDraftMutable } from "../entities/requirementSet";
import {
  createRequirementVersion,
  type RequirementVersion,
  type RequirementVersionSnapshot,
} from "../entities/requirementVersion";

export interface PublishRequirementVersionOutcome {
  version: RequirementVersion;
  updatedSet: RequirementSet;
}

export function assertRequirementSetDraftEditable(set: RequirementSet): VersionResult<void> {
  if (!isRequirementSetDraftMutable(set)) {
    return versionFailOne(
      "VERSION_DRAFT_MUTATION_FORBIDDEN",
      "Requirement set is not editable after approval or supersession",
    );
  }
  return versionOk(undefined);
}

export function updateRequirementSetDraft(
  set: RequirementSet,
  input: { title?: string; items: RequirementSet["items"]; updatedAt: EpochMs },
): VersionResult<RequirementSet> {
  const editable = assertRequirementSetDraftEditable(set);
  if (!editable.ok) return editable;

  return versionOk({
    ...set,
    title: input.title ?? set.title,
    items: input.items,
    aiGenerated: false,
    updatedAt: input.updatedAt,
  });
}

export function publishRequirementVersion(input: {
  set: RequirementSet;
  existingVersionNumbers: readonly number[];
  versionId: string;
  publishedAt: EpochMs;
  publishedByUserId: UserId;
  approvalNote?: string;
  attachmentRefs?: string[];
  supersedesVersionId?: string;
}): VersionResult<PublishRequirementVersionOutcome> {
  const { set } = input;
  if (!isRequirementSetDraftMutable(set)) {
    return versionFailOne(
      "VERSION_INVALID_STATUS",
      "Only draft or in-review requirement sets can be published",
    );
  }

  const nextVersionNumber =
    input.existingVersionNumbers.length > 0
      ? Math.max(...input.existingVersionNumbers) + 1
      : 1;

  const monotonic = assertMonotonicVersionNumber(input.existingVersionNumbers, nextVersionNumber);
  if (!monotonic.ok) return monotonic;

  const snapshot: RequirementVersionSnapshot = {
    title: set.title,
    items: set.items.map((item) => ({ ...item })),
    attachmentRefs: input.attachmentRefs,
  };

  const version = createRequirementVersion({
    id: input.versionId,
    companyId: set.companyId,
    engagementId: set.engagementId,
    requirementSetId: set.id,
    versionNumber: nextVersionNumber,
    publishedAt: input.publishedAt,
    publishedByUserId: input.publishedByUserId,
    snapshot,
    supersedesVersionId: input.supersedesVersionId,
  });

  const updatedSet: RequirementSet = {
    ...set,
    status: "approved",
    approvalNote: input.approvalNote,
    approvedAt: input.publishedAt,
    updatedAt: input.publishedAt,
    version: nextVersionNumber,
    currentApprovedVersionId: version.id,
    currentApprovedVersionNumber: nextVersionNumber,
  };

  return versionOk({ version, updatedSet });
}

export function supersedeRequirementSet(
  set: RequirementSet,
  supersededAt: EpochMs,
): VersionResult<RequirementSet> {
  if (set.status !== "approved") {
    return versionFailOne("VERSION_INVALID_STATUS", "Only approved sets can be superseded");
  }
  return versionOk({
    ...set,
    status: "superseded",
    updatedAt: supersededAt,
  });
}

export function validateRequirementVersionRefs(input: {
  version: RequirementVersion;
  expectedCompanyId: CompanyId;
  expectedEngagementId: DeliveryEngagementId;
  expectedSetId?: string;
}): VersionResult<void> {
  const company = assertSameCompany(input.expectedCompanyId, input.version.companyId, "RequirementVersion");
  if (!company.ok) return company;
  if (input.version.engagementId !== input.expectedEngagementId) {
    return versionFailOne("VERSION_REF_MISMATCH", "RequirementVersion engagementId mismatch");
  }
  if (input.expectedSetId && input.version.requirementSetId !== input.expectedSetId) {
    return versionFailOne("VERSION_REF_MISMATCH", "RequirementVersion requirementSetId mismatch");
  }
  return versionOk(undefined);
}

/** Domain guard — published versions cannot be updated (E2 enforces at persistence). */
export function rejectRequirementVersionMutation(): VersionResult<never> {
  return versionFailOne("VERSION_IMMUTABLE", "Published RequirementVersion cannot be mutated");
}
