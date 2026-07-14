/**
 * Estimated duration unit for milestone planning (no automatic calculations).
 */

export const MILESTONE_DURATION_UNIT = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
} as const;

export type MilestoneDurationUnit =
  (typeof MILESTONE_DURATION_UNIT)[keyof typeof MILESTONE_DURATION_UNIT];

export const MILESTONE_DURATION_UNIT_LABELS: Record<MilestoneDurationUnit, string> = {
  [MILESTONE_DURATION_UNIT.DAYS]: "Days",
  [MILESTONE_DURATION_UNIT.WEEKS]: "Weeks",
  [MILESTONE_DURATION_UNIT.MONTHS]: "Months",
};

const VALID = new Set<string>(Object.values(MILESTONE_DURATION_UNIT));

export function isMilestoneDurationUnit(value: unknown): value is MilestoneDurationUnit {
  return typeof value === "string" && VALID.has(value);
}
