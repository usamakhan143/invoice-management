import type { CompanyId } from "../../types";

/** Deterministic immutable version document IDs — Phase E locked strategy. */
export function requirementVersionDocId(
  companyId: CompanyId,
  requirementSetId: string,
  versionNumber: number,
): string {
  return `${companyId}__${requirementSetId}__v${versionNumber}`;
}

export function promptVersionDocId(
  companyId: CompanyId,
  promptArtifactId: string,
  versionNumber: number,
): string {
  return `${companyId}__${promptArtifactId}__v${versionNumber}`;
}

export function createRandomVersionChainId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}
