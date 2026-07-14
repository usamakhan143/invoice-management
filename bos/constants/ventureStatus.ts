/**
 * BosVenture lifecycle states — Doc 11 §1.
 * @see docs/business-operating-system/11_Entity_Lifecycles.txt
 */

export const VENTURE_STATUS = {
  PLANNED: "planned",
  ACTIVE: "active",
  PAUSED: "paused",
  WINDING_DOWN: "winding_down",
  ARCHIVED: "archived",
} as const;

export type VentureStatus = (typeof VENTURE_STATUS)[keyof typeof VENTURE_STATUS];

export const VENTURE_STATUS_LABELS: Record<VentureStatus, string> = {
  [VENTURE_STATUS.PLANNED]: "Planned",
  [VENTURE_STATUS.ACTIVE]: "Active",
  [VENTURE_STATUS.PAUSED]: "Paused",
  [VENTURE_STATUS.WINDING_DOWN]: "Winding down",
  [VENTURE_STATUS.ARCHIVED]: "Archived",
};

export const TERMINAL_VENTURE_STATUSES: readonly VentureStatus[] = [
  VENTURE_STATUS.ARCHIVED,
];
