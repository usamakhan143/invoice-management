import { describe, expect, it } from "vitest";
import { createRequirementVersion } from "../../requirements/entities/requirementVersion";
import { createPromptPackHead } from "../entities/promptPack";
import {
  approvePromptPackHead,
  publishPromptArtifactVersion,
  rejectPromptVersionMutation,
} from "../rules/promptVersionRules";

const companyId = "co1";
const engagementId = "eng1";
const actorUserId = "user1";

function requirementVersion() {
  return createRequirementVersion({
    id: "req-ver-1",
    companyId,
    engagementId,
    requirementSetId: "set-1",
    versionNumber: 1,
    publishedAt: 1,
    publishedByUserId: actorUserId,
    snapshot: { title: "Req", items: [{ id: "r1", title: "R", description: "D" }] },
  });
}

function draftPack(requirementVersionId = "req-ver-1") {
  return createPromptPackHead({
    id: "pack-1",
    companyId,
    engagementId,
    requirementVersionId,
    title: "Pack",
    aiGenerated: true,
    updatedAt: 1,
    artifacts: [{ id: "art-1", title: "Artifact", body: "Body" }],
  });
}

describe("promptVersionRules", () => {
  it("cannot publish without requirementVersionId", () => {
    const pack = { ...draftPack(""), requirementVersionId: "" };
    const result = publishPromptArtifactVersion({
      pack,
      artifactId: "art-1",
      requirementVersion: requirementVersion(),
      existingVersionNumbers: [],
      versionId: "pv-1",
      publishedAt: 2,
      publishedByUserId: actorUserId,
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("VERSION_MISSING_REF");
  });

  it("publish PromptVersion v1 and increments next version", () => {
    const req = requirementVersion();
    const v1 = publishPromptArtifactVersion({
      pack: draftPack(),
      artifactId: "art-1",
      requirementVersion: req,
      existingVersionNumbers: [],
      versionId: "pv-1",
      publishedAt: 2,
      publishedByUserId: actorUserId,
    });
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;
    expect(v1.value.version.versionNumber).toBe(1);
    expect(Object.isFrozen(v1.value.version)).toBe(true);

    const v2 = publishPromptArtifactVersion({
      pack: { ...v1.value.updatedPack, status: "draft" },
      artifactId: "art-1",
      requirementVersion: req,
      existingVersionNumbers: [1],
      versionId: "pv-2",
      publishedAt: 3,
      publishedByUserId: actorUserId,
      supersedesVersionId: "pv-1",
    });
    expect(v2.ok).toBe(true);
    if (!v2.ok) return;
    expect(v2.value.version.versionNumber).toBe(2);
    expect(v2.value.version.supersedesVersionId).toBe("pv-1");
  });

  it("rejects published prompt version mutation API", () => {
    const rejected = rejectPromptVersionMutation();
    expect(rejected.ok).toBe(false);
  });

  it("requires all artifacts published before pack approval", () => {
    const pack = draftPack();
    const approved = approvePromptPackHead(pack, { approvedAt: 2 });
    expect(approved.ok).toBe(false);
  });
});
