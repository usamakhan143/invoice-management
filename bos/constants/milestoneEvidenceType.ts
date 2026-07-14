/**
 * Evidence types linking milestone completion to business facts.
 * Extensible for future integrations — never hardcode milestone names.
 */

export const MILESTONE_EVIDENCE_TYPE = {
  DECISION: "decision",
  EXPENSE: "expense",
  INVOICE: "invoice",
  LEAD: "lead",
  MANUAL: "manual",
  INTEGRATION: "integration",
} as const;

export type MilestoneEvidenceType =
  (typeof MILESTONE_EVIDENCE_TYPE)[keyof typeof MILESTONE_EVIDENCE_TYPE];

export const MILESTONE_EVIDENCE_TYPE_LABELS: Record<MilestoneEvidenceType, string> = {
  [MILESTONE_EVIDENCE_TYPE.DECISION]: "Decision",
  [MILESTONE_EVIDENCE_TYPE.EXPENSE]: "Expense",
  [MILESTONE_EVIDENCE_TYPE.INVOICE]: "Invoice",
  [MILESTONE_EVIDENCE_TYPE.LEAD]: "Lead",
  [MILESTONE_EVIDENCE_TYPE.MANUAL]: "Manual",
  [MILESTONE_EVIDENCE_TYPE.INTEGRATION]: "Integration",
};
