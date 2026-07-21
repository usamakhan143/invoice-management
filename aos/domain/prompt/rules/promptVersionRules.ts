import type { EpochMs, UserId } from "../../../types/primitives";
import {
  assertMonotonicVersionNumber,
  assertSameCompany,
  versionFailOne,
  versionOk,
  type VersionResult,
} from "../../versioning/versionResult";
import type { RequirementVersion } from "../../requirements/entities/requirementVersion";
import type { PromptArtifactHead, PromptPack } from "../entities/promptPack";
import { isPromptPackDraftMutable } from "../entities/promptPack";
import { createPromptVersion, type PromptVersion } from "../entities/promptVersion";

export interface PublishPromptVersionOutcome {
  version: PromptVersion;
  updatedArtifact: PromptArtifactHead;
  updatedPack: PromptPack;
}

export function assertPromptPackHasRequirementVersion(pack: PromptPack): VersionResult<void> {
  if (!pack.requirementVersionId?.trim()) {
    return versionFailOne("VERSION_MISSING_REF", "PromptPack must reference requirementVersionId");
  }
  return versionOk(undefined);
}

export function publishPromptArtifactVersion(input: {
  pack: PromptPack;
  artifactId: string;
  requirementVersion: RequirementVersion;
  existingVersionNumbers: readonly number[];
  versionId: string;
  publishedAt: EpochMs;
  publishedByUserId: UserId;
  supersedesVersionId?: string;
  rubricVersionId?: string;
}): VersionResult<PublishPromptVersionOutcome> {
  if (!isPromptPackDraftMutable(input.pack)) {
    return versionFailOne("VERSION_INVALID_STATUS", "Prompt pack is not in a publishable state");
  }

  const reqRef = assertPromptPackHasRequirementVersion(input.pack);
  if (!reqRef.ok) return reqRef;

  if (input.pack.requirementVersionId !== input.requirementVersion.id) {
    return versionFailOne(
      "VERSION_REF_MISMATCH",
      "PromptPack requirementVersionId must match published RequirementVersion",
    );
  }

  const companyCheck = assertSameCompany(
    input.pack.companyId,
    input.requirementVersion.companyId,
    "PromptPack/RequirementVersion",
  );
  if (!companyCheck.ok) return companyCheck;

  const artifact = input.pack.artifacts.find((a) => a.id === input.artifactId);
  if (!artifact) {
    return versionFailOne("VERSION_NOT_FOUND", "Prompt artifact not found in pack");
  }

  const nextVersionNumber =
    input.existingVersionNumbers.length > 0
      ? Math.max(...input.existingVersionNumbers) + 1
      : 1;

  const monotonic = assertMonotonicVersionNumber(input.existingVersionNumbers, nextVersionNumber);
  if (!monotonic.ok) return monotonic;

  const version = createPromptVersion({
    id: input.versionId,
    companyId: input.pack.companyId,
    engagementId: input.pack.engagementId,
    promptPackId: input.pack.id,
    promptArtifactId: artifact.id,
    requirementVersionId: input.requirementVersion.id,
    versionNumber: nextVersionNumber,
    publishedAt: input.publishedAt,
    publishedByUserId: input.publishedByUserId,
    snapshot: {
      title: artifact.title,
      body: artifact.body,
      rubricVersionId: input.rubricVersionId,
    },
    supersedesVersionId: input.supersedesVersionId,
  });

  const updatedArtifact: PromptArtifactHead = {
    ...artifact,
    currentApprovedVersionId: version.id,
    currentApprovedVersionNumber: nextVersionNumber,
  };

  const updatedPack: PromptPack = {
    ...input.pack,
    artifacts: input.pack.artifacts.map((a) => (a.id === artifact.id ? updatedArtifact : a)),
    updatedAt: input.publishedAt,
  };

  return versionOk({ version, updatedArtifact, updatedPack });
}

export function approvePromptPackHead(
  pack: PromptPack,
  input: { approvalNote?: string; approvedAt: EpochMs },
): VersionResult<PromptPack> {
  const allArtifactsPublished = pack.artifacts.every((a) => Boolean(a.currentApprovedVersionId));
  if (!allArtifactsPublished) {
    return versionFailOne(
      "VERSION_INVALID_STATUS",
      "All prompt artifacts must have a published version before pack approval",
    );
  }
  return versionOk({
    ...pack,
    status: "approved",
    approvalNote: input.approvalNote,
    approvedAt: input.approvedAt,
    updatedAt: input.approvedAt,
  });
}

export function replanPromptPack(input: {
  priorPack: PromptPack;
  newPackId: string;
  updatedAt: EpochMs;
}): VersionResult<PromptPack> {
  if (input.priorPack.status === "archived") {
    return versionFailOne("VERSION_INVALID_STATUS", "Pack is already archived");
  }
  return versionOk({
    ...input.priorPack,
    id: input.newPackId,
    packVersion: input.priorPack.packVersion + 1,
    version: input.priorPack.packVersion + 1,
    status: "draft",
    supersedesPackId: input.priorPack.id,
    updatedAt: input.updatedAt,
    approvalNote: undefined,
    approvedAt: undefined,
    artifacts: input.priorPack.artifacts.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
    })),
  });
}

export function rejectPromptVersionMutation(): VersionResult<never> {
  return versionFailOne("VERSION_IMMUTABLE", "Published PromptVersion cannot be mutated");
}
