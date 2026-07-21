import { describe, expect, it } from "vitest";
import { assertMonotonicVersionNumber } from "../../versioning/versionResult";
import { createRequirementSetHead } from "../entities/requirementSet";
import {
  publishRequirementVersion,
  rejectRequirementVersionMutation,
  supersedeRequirementSet,
  updateRequirementSetDraft,
} from "../rules/requirementVersionRules";

const companyId = "co1";
const engagementId = "eng1";
const actorUserId = "user1";

function draftSet() {
  return createRequirementSetHead({
    id: "set-1",
    companyId,
    engagementId,
    title: "Requirements",
    aiGenerated: true,
    updatedAt: 1,
    items: [{ id: "r1", title: "Req", description: "Body" }],
  });
}

describe("requirementVersionRules", () => {
  it("publish v1", () => {
    const result = publishRequirementVersion({
      set: draftSet(),
      existingVersionNumbers: [],
      versionId: "ver-1",
      publishedAt: 2,
      publishedByUserId: actorUserId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version.versionNumber).toBe(1);
    expect(result.value.updatedSet.currentApprovedVersionId).toBe("ver-1");
    expect(Object.isFrozen(result.value.version)).toBe(true);
  });

  it("publish next valid version in monotonic sequence v1 → v2 → v3", () => {
    let numbers: number[] = [];
    for (let n = 1; n <= 3; n += 1) {
      const published = publishRequirementVersion({
        set: { ...draftSet(), status: n === 1 ? "draft" : "in_review" },
        existingVersionNumbers: numbers,
        versionId: `ver-${n}`,
        publishedAt: n,
        publishedByUserId: actorUserId,
        supersedesVersionId: n > 1 ? `ver-${n - 1}` : undefined,
      });
      expect(published.ok).toBe(true);
      if (!published.ok) return;
      expect(published.value.version.versionNumber).toBe(n);
      expect(published.value.version.supersedesVersionId).toBe(n > 1 ? `ver-${n - 1}` : undefined);
      numbers = [...numbers, n];
    }
  });

  it("rejects duplicate/reused version number", () => {
    const result = assertMonotonicVersionNumber([1, 2], 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("VERSION_DUPLICATE_NUMBER");
  });

  it("rejects invalid draft mutation after approval", () => {
    const approved = publishRequirementVersion({
      set: draftSet(),
      existingVersionNumbers: [],
      versionId: "ver-1",
      publishedAt: 2,
      publishedByUserId: actorUserId,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const update = updateRequirementSetDraft(approved.value.updatedSet, {
      items: [{ id: "x", title: "X", description: "Y" }],
      updatedAt: 3,
    });
    expect(update.ok).toBe(false);
  });

  it("rejects published requirement version mutation API", () => {
    const rejected = rejectRequirementVersionMutation();
    expect(rejected.ok).toBe(false);
    expect(rejected.errors[0]?.code).toBe("VERSION_IMMUTABLE");
  });

  it("preserves supersession on set supersede", () => {
    const approved = publishRequirementVersion({
      set: draftSet(),
      existingVersionNumbers: [],
      versionId: "ver-1",
      publishedAt: 2,
      publishedByUserId: actorUserId,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const superseded = supersedeRequirementSet(approved.value.updatedSet, 3);
    expect(superseded.ok).toBe(true);
    if (!superseded.ok) return;
    expect(superseded.value.status).toBe("superseded");
  });
});
