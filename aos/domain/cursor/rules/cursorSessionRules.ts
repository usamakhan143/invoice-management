import type { EpochMs } from "../../../types/primitives";
import {
  assertSameCompany,
  freezePublishedRecord,
  versionFailOne,
  versionOk,
  type VersionResult,
} from "../../versioning/versionResult";
import type { PromptVersion } from "../../prompt/entities/promptVersion";
import {
  createCursorSession,
  isCursorSessionFinalized,
  type CursorSession,
} from "../entities/cursorSession";
import {
  createCursorRevision,
  type CursorRevision,
} from "../entities/cursorRevision";

export function startCursorSession(input: {
  id: string;
  companyId: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  promptVersion: PromptVersion;
  executorUserId: string;
  startedAt: EpochMs;
}): VersionResult<CursorSession> {
  if (!input.promptVersion.id?.trim()) {
    return versionFailOne("VERSION_MISSING_REF", "Cursor session requires exact promptVersionId");
  }

  const company = assertSameCompany(input.companyId, input.promptVersion.companyId, "CursorSession");
  if (!company.ok) return company;

  if (input.promptVersion.promptArtifactId !== input.promptArtifactId) {
    return versionFailOne("VERSION_REF_MISMATCH", "PromptVersion artifact mismatch");
  }
  if (input.promptVersion.promptPackId !== input.promptPackId) {
    return versionFailOne("VERSION_REF_MISMATCH", "PromptVersion pack mismatch");
  }

  return versionOk(
    createCursorSession({
      id: input.id,
      companyId: input.companyId,
      engagementId: input.engagementId,
      promptPackId: input.promptPackId,
      promptArtifactId: input.promptArtifactId,
      promptVersionId: input.promptVersion.id,
      executorUserId: input.executorUserId,
      startedAt: input.startedAt,
    }),
  );
}

export function updateCursorSessionCapture(
  session: CursorSession,
  input: { captureSummary: string; capturedAt: EpochMs },
): VersionResult<CursorSession> {
  if (isCursorSessionFinalized(session)) {
    return versionFailOne("VERSION_ALREADY_FINALIZED", "Finalized cursor session cannot be mutated");
  }

  return versionOk({
    ...session,
    captureSummary: input.captureSummary,
    capturedAt: input.capturedAt,
    status: "captured",
  });
}

export function finalizeCursorSession(
  session: CursorSession,
  input: { status: "passed" | "failed" | "submitted"; finalizedAt: EpochMs },
): VersionResult<Readonly<CursorSession>> {
  if (isCursorSessionFinalized(session)) {
    return versionFailOne("VERSION_ALREADY_FINALIZED", "Session already finalized");
  }
  if (!session.captureSummary?.trim() && input.status !== "submitted") {
    return versionFailOne("VERSION_INVALID_STATUS", "Capture required before finalization");
  }

  const finalized: CursorSession = {
    ...session,
    status: input.status,
    finalizedAt: input.finalizedAt,
  };

  return versionOk(Object.freeze(finalized));
}

export function rejectCursorSessionHistoryMutation(): VersionResult<never> {
  return versionFailOne("VERSION_IMMUTABLE", "Finalized CursorSession history cannot be mutated");
}

export function openCursorRevision(input: {
  id: string;
  session: CursorSession;
  createdAt: EpochMs;
  createdByUserId: string;
}): VersionResult<CursorRevision> {
  if (input.session.status !== "failed") {
    return versionFailOne("VERSION_INVALID_STATUS", "Revision requires a failed cursor session");
  }

  return versionOk(
    createCursorRevision({
      id: input.id,
      companyId: input.session.companyId,
      engagementId: input.session.engagementId,
      cursorSessionId: input.session.id,
      originalPromptVersionId: input.session.promptVersionId,
      createdAt: input.createdAt,
      createdByUserId: input.createdByUserId,
    }),
  );
}

export function resolveCursorRevision(
  revision: CursorRevision,
  input: { revisionPromptVersionId: string; resolvedAt: EpochMs },
): VersionResult<CursorRevision> {
  if (revision.status !== "open") {
    return versionFailOne("VERSION_INVALID_STATUS", "Revision is not open");
  }
  if (!input.revisionPromptVersionId.trim()) {
    return versionFailOne("VERSION_MISSING_REF", "Revision requires revisionPromptVersionId");
  }

  return versionOk(
    freezePublishedRecord({
      ...revision,
      revisionPromptVersionId: input.revisionPromptVersionId,
      status: "resolved" as const,
      resolvedAt: input.resolvedAt,
    }),
  );
}
