/** Founder-friendly version label helpers for E3 history UI. */

export function formatVersionTimestamp(epochMs: number | undefined): string {
  if (epochMs == null || Number.isNaN(epochMs)) return "—";
  return new Date(epochMs).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function requirementVersionLabel(versionNumber: number): string {
  return `Requirement v${versionNumber}`;
}

export function promptVersionLabel(versionNumber: number, artifactTitle?: string): string {
  return artifactTitle ? `${artifactTitle} v${versionNumber}` : `Prompt v${versionNumber}`;
}

export function cursorSessionLabel(sessionId: string): string {
  const short = sessionId.length > 12 ? `${sessionId.slice(0, 8)}…` : sessionId;
  return `Cursor Session ${short}`;
}

export function evaluationLabel(evaluationId: string, passed?: boolean): string {
  const outcome = passed === true ? "Passed" : passed === false ? "Failed" : "Evaluation";
  return `${outcome} · ${evaluationId.slice(0, 8)}…`;
}
