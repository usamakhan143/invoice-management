/**
 * Cursor session lifecycle status — frozen domain model §04.
 * @see docs/aos-domain-model/04_CURSOR_DOMAIN.md
 */

export const CURSOR_STATUS = {
  STARTED: "started",
  CAPTURED: "captured",
  EVALUATED: "evaluated",
  PASSED: "passed",
  FAILED: "failed",
  REVISED: "revised",
} as const;

export type CursorStatus = (typeof CURSOR_STATUS)[keyof typeof CURSOR_STATUS];

export const CURSOR_STATUS_LABELS: Record<CursorStatus, string> = {
  [CURSOR_STATUS.STARTED]: "Started",
  [CURSOR_STATUS.CAPTURED]: "Captured",
  [CURSOR_STATUS.EVALUATED]: "Evaluated",
  [CURSOR_STATUS.PASSED]: "Passed",
  [CURSOR_STATUS.FAILED]: "Failed",
  [CURSOR_STATUS.REVISED]: "Revised",
};

export const TERMINAL_CURSOR_STATUSES: readonly CursorStatus[] = [
  CURSOR_STATUS.PASSED,
  CURSOR_STATUS.FAILED,
];
