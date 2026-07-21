import { describe, expect, it } from "vitest";
import { createPromptVersion } from "../../prompt/entities/promptVersion";
import { createCursorSession } from "../entities/cursorSession";
import {
  finalizeCursorSession,
  openCursorRevision,
  rejectCursorSessionHistoryMutation,
  resolveCursorRevision,
  startCursorSession,
  updateCursorSessionCapture,
} from "../rules/cursorSessionRules";

const companyId = "co1";
const engagementId = "eng1";

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
    publishedByUserId: "user1",
    snapshot: { title: "T", body: "B" },
  });
}

describe("cursorSessionRules", () => {
  it("session cannot start without exact promptVersionId", () => {
    const badVersion = { ...promptVersion(), id: "" };
    const result = startCursorSession({
      id: "s1",
      companyId,
      engagementId,
      promptPackId: "pack-1",
      promptArtifactId: "art-1",
      promptVersion: badVersion,
      executorUserId: "user1",
      startedAt: 1,
    });
    expect(result.ok).toBe(false);
  });

  it("allows pre-finalization capture behavior", () => {
    const started = startCursorSession({
      id: "s1",
      companyId,
      engagementId,
      promptPackId: "pack-1",
      promptArtifactId: "art-1",
      promptVersion: promptVersion(),
      executorUserId: "user1",
      startedAt: 1,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const captured = updateCursorSessionCapture(started.value, {
      captureSummary: "Done",
      capturedAt: 2,
    });
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;
    expect(captured.value.status).toBe("captured");
  });

  it("finalized session cannot be historically mutated", () => {
    const session = createCursorSession({
      id: "s1",
      companyId,
      engagementId,
      promptPackId: "pack-1",
      promptArtifactId: "art-1",
      promptVersionId: "pv-1",
      executorUserId: "user1",
      startedAt: 1,
    });
    const captured = updateCursorSessionCapture(session, { captureSummary: "x", capturedAt: 2 });
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;

    const finalized = finalizeCursorSession(captured.value, { status: "failed", finalizedAt: 3 });
    expect(finalized.ok).toBe(true);
    if (!finalized.ok) return;

    const mutate = updateCursorSessionCapture(finalized.value as typeof session, {
      captureSummary: "hack",
      capturedAt: 4,
    });
    expect(mutate.ok).toBe(false);
    expect(rejectCursorSessionHistoryMutation().errors[0]?.code).toBe("VERSION_IMMUTABLE");
  });

  it("failed session can produce valid CursorRevision", () => {
    const session = {
      ...createCursorSession({
        id: "s1",
        companyId,
        engagementId,
        promptPackId: "pack-1",
        promptArtifactId: "art-1",
        promptVersionId: "pv-1",
        executorUserId: "user1",
        startedAt: 1,
      }),
      status: "failed" as const,
    };
    const revision = openCursorRevision({
      id: "rev-1",
      session,
      createdAt: 2,
      createdByUserId: "user1",
    });
    expect(revision.ok).toBe(true);
    if (!revision.ok) return;

    const resolved = resolveCursorRevision(revision.value, {
      revisionPromptVersionId: "pv-2",
      resolvedAt: 3,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value.status).toBe("resolved");
    expect(resolved.value.revisionPromptVersionId).toBe("pv-2");
  });

  it("rejects invalid revision chain when session not failed", () => {
    const session = createCursorSession({
      id: "s1",
      companyId,
      engagementId,
      promptPackId: "pack-1",
      promptArtifactId: "art-1",
      promptVersionId: "pv-1",
      executorUserId: "user1",
      startedAt: 1,
    });
    const revision = openCursorRevision({
      id: "rev-1",
      session,
      createdAt: 2,
      createdByUserId: "user1",
    });
    expect(revision.ok).toBe(false);
  });
});
