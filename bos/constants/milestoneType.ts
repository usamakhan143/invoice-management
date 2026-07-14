/**
 * Milestone type presets — UI suggestions only; stored value is a free-form string.
 */

export const MILESTONE_TYPE_PRESET = {
  APPROVAL: "Approval",
  DELIVERABLE: "Deliverable",
  DECISION: "Decision",
  MEETING: "Meeting",
  CAMPAIGN: "Campaign",
  DEVELOPMENT: "Development",
  MARKETING: "Marketing",
  SALES: "Sales",
  FINANCE: "Finance",
  LEGAL: "Legal",
  REVIEW: "Review",
  CLIENT: "Client",
  INTERNAL: "Internal",
  OTHER: "Other",
  CUSTOM: "__custom__",
} as const;

export const MILESTONE_TYPE_PRESET_OPTIONS: readonly string[] = [
  MILESTONE_TYPE_PRESET.APPROVAL,
  MILESTONE_TYPE_PRESET.DELIVERABLE,
  MILESTONE_TYPE_PRESET.DECISION,
  MILESTONE_TYPE_PRESET.MEETING,
  MILESTONE_TYPE_PRESET.CAMPAIGN,
  MILESTONE_TYPE_PRESET.DEVELOPMENT,
  MILESTONE_TYPE_PRESET.MARKETING,
  MILESTONE_TYPE_PRESET.SALES,
  MILESTONE_TYPE_PRESET.FINANCE,
  MILESTONE_TYPE_PRESET.LEGAL,
  MILESTONE_TYPE_PRESET.REVIEW,
  MILESTONE_TYPE_PRESET.CLIENT,
  MILESTONE_TYPE_PRESET.INTERNAL,
  MILESTONE_TYPE_PRESET.OTHER,
];

export function isKnownMilestoneTypePreset(value: string): boolean {
  return MILESTONE_TYPE_PRESET_OPTIONS.includes(value);
}
