import { describe, expect, it } from "vitest";
import { createCursorSession } from "../../cursor/entities/cursorSession";
import { createPromptVersion } from "../../prompt/entities/promptVersion";
import { createRequirementVersion } from "../../requirements/entities/requirementVersion";
import { DEFAULT_DELIVERY_RUBRIC } from "../entities/evaluationRubric";
import {
  amendEvaluation,
  confirmEvaluation,
  createDraftEvaluation,
  rejectEvaluationMutation,
  updateEvaluationDraftScores,
} from "../rules/evaluationRules";

const companyId = "co1";
const engagementId = "eng1";
const actorUserId = "user1";

function session() {
  return createCursorSession({
    id: "sess-1",
    companyId,
    engagementId,
    promptPackId: "pack-1",
    promptArtifactId: "art-1",
    promptVersionId: "pv-1",
    executorUserId: actorUserId,
    startedAt: 1,
  });
}

function promptVersion() {
  return createPromptVersion({
    id: "pv-1",
    companyId,
    engagementId,
    promptPackId: "pack-1",
    promptArtifactId: "art-1",
    requirementVersionId: "rv-1",
    versionNumber: 1,
    publishedAt: 1,
    publishedByUserId: actorUserId,
    snapshot: { title: "T", body: "B" },
  });
}

function requirementVersion() {
  return createRequirementVersion({
    id: "rv-1",
    companyId,
    engagementId,
    requirementSetId: "set-1",
    versionNumber: 1,
    publishedAt: 1,
    publishedByUserId: actorUserId,
    snapshot: { title: "R", items: [] },
  });
}

const criteria = [{ id: "c1", label: "Coverage", passed: true, score: 90 }];

describe("evaluationRules", () => {
  it("pins exact session + prompt + requirement + rubric version", () => {
    const draft = createDraftEvaluation({
      id: "eval-1",
      companyId,
      engagementId,
      session: session(),
      promptVersion: promptVersion(),
      requirementVersion: requirementVersion(),
      rubric: DEFAULT_DELIVERY_RUBRIC,
      criteria,
      scorePercent: 88,
      passed: true,
      createdAt: 2,
    });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.value.rubricVersionId).toBe(DEFAULT_DELIVERY_RUBRIC.rubricVersionId);
    expect(draft.value.promptVersionId).toBe("pv-1");
    expect(draft.value.requirementVersionId).toBe("rv-1");
  });

  it("supports draft update then confirm with immutability", () => {
    const draftResult = createDraftEvaluation({
      id: "eval-1",
      companyId,
      engagementId,
      session: session(),
      promptVersion: promptVersion(),
      requirementVersion: requirementVersion(),
      rubric: DEFAULT_DELIVERY_RUBRIC,
      criteria,
      scorePercent: 70,
      passed: false,
      createdAt: 2,
    });
    expect(draftResult.ok).toBe(true);
    if (!draftResult.ok) return;

    const updated = updateEvaluationDraftScores(draftResult.value, {
      criteria,
      scorePercent: 88,
      passed: true,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    const confirmed = confirmEvaluation(updated.value, {
      confirmedAt: 3,
      confirmedByUserId: actorUserId,
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(Object.isFrozen(confirmed.value)).toBe(true);
    expect(rejectEvaluationMutation().errors[0]?.code).toBe("VERSION_IMMUTABLE");
  });

  it("amendment creates new evaluation identity with amendsEvaluationId", () => {
    const draftResult = createDraftEvaluation({
      id: "eval-1",
      companyId,
      engagementId,
      session: session(),
      promptVersion: promptVersion(),
      requirementVersion: requirementVersion(),
      rubric: DEFAULT_DELIVERY_RUBRIC,
      criteria,
      scorePercent: 88,
      passed: true,
      createdAt: 2,
    });
    expect(draftResult.ok).toBe(true);
    if (!draftResult.ok) return;
    const confirmed = confirmEvaluation(draftResult.value, {
      confirmedAt: 3,
      confirmedByUserId: actorUserId,
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;

    const amended = amendEvaluation({
      prior: confirmed.value,
      newDraftId: "eval-2",
      criteria,
      scorePercent: 92,
      passed: true,
      createdAt: 4,
      rubric: DEFAULT_DELIVERY_RUBRIC,
    });
    expect(amended.ok).toBe(true);
    if (!amended.ok) return;
    expect(amended.value.id).toBe("eval-2");
    expect(amended.value.amendsEvaluationId).toBe("eval-1");
  });

  it("rejects company mismatch on cross-reference", () => {
    const badPrompt = createPromptVersion({
      ...promptVersion(),
      companyId: "co-other",
    });
    const draft = createDraftEvaluation({
      id: "eval-1",
      companyId,
      engagementId,
      session: session(),
      promptVersion: badPrompt,
      requirementVersion: requirementVersion(),
      rubric: DEFAULT_DELIVERY_RUBRIC,
      criteria,
      scorePercent: 88,
      passed: true,
      createdAt: 2,
    });
    expect(draft.ok).toBe(false);
    expect(draft.errors[0]?.code).toBe("VERSION_COMPANY_MISMATCH");
  });
});
