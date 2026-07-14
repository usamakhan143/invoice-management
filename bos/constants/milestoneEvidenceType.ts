/**
 * Evidence types linking milestone completion to business facts.
 * Extensible for future integrations — never hardcode milestone names.
 */

export const MILESTONE_EVIDENCE_TYPE = {
  DECISION: "decision",
  EXPENSE: "expense",
  INVOICE: "invoice",
  DOCUMENT: "document",
  URL: "url",
  SCREENSHOT: "screenshot",
  MANUAL: "manual",
  /** @deprecated Legacy — use MANUAL or DOCUMENT */
  LEAD: "lead",
  /** @deprecated Legacy integrations */
  INTEGRATION: "integration",
} as const;

export type MilestoneEvidenceType =
  (typeof MILESTONE_EVIDENCE_TYPE)[keyof typeof MILESTONE_EVIDENCE_TYPE];

/** Founder-facing labels for the completion dialog. */
export const MILESTONE_EVIDENCE_SOURCE_LABELS: Record<MilestoneEvidenceType, string> = {
  [MILESTONE_EVIDENCE_TYPE.DECISION]: "Decision",
  [MILESTONE_EVIDENCE_TYPE.EXPENSE]: "Expense",
  [MILESTONE_EVIDENCE_TYPE.INVOICE]: "Invoice",
  [MILESTONE_EVIDENCE_TYPE.DOCUMENT]: "Document",
  [MILESTONE_EVIDENCE_TYPE.URL]: "URL",
  [MILESTONE_EVIDENCE_TYPE.SCREENSHOT]: "Screenshot",
  [MILESTONE_EVIDENCE_TYPE.MANUAL]: "Manual Note",
  [MILESTONE_EVIDENCE_TYPE.LEAD]: "Lead",
  [MILESTONE_EVIDENCE_TYPE.INTEGRATION]: "Integration",
};

/** Evidence sources shown in the milestone completion dialog. */
export const MILESTONE_COMPLETION_EVIDENCE_SOURCES: readonly MilestoneEvidenceType[] = [
  MILESTONE_EVIDENCE_TYPE.DECISION,
  MILESTONE_EVIDENCE_TYPE.EXPENSE,
  MILESTONE_EVIDENCE_TYPE.INVOICE,
  MILESTONE_EVIDENCE_TYPE.DOCUMENT,
  MILESTONE_EVIDENCE_TYPE.URL,
  MILESTONE_EVIDENCE_TYPE.SCREENSHOT,
  MILESTONE_EVIDENCE_TYPE.MANUAL,
];

/** @deprecated Use MILESTONE_EVIDENCE_SOURCE_LABELS */
export const MILESTONE_EVIDENCE_TYPE_LABELS = MILESTONE_EVIDENCE_SOURCE_LABELS;
