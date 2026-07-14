import { VENTURE_STATUS, type VentureStatus } from "../../constants/ventureStatus";

export type VentureTransitionEvent =
  | "activate"
  | "pause"
  | "resume"
  | "wind_down"
  | "archive";

const VENTURE_TRANSITIONS: Record<
  VentureStatus,
  Partial<Record<VentureTransitionEvent, VentureStatus>>
> = {
  [VENTURE_STATUS.PLANNED]: {
    activate: VENTURE_STATUS.ACTIVE,
  },
  [VENTURE_STATUS.ACTIVE]: {
    pause: VENTURE_STATUS.PAUSED,
    wind_down: VENTURE_STATUS.WINDING_DOWN,
  },
  [VENTURE_STATUS.PAUSED]: {
    resume: VENTURE_STATUS.ACTIVE,
  },
  [VENTURE_STATUS.WINDING_DOWN]: {
    archive: VENTURE_STATUS.ARCHIVED,
  },
  [VENTURE_STATUS.ARCHIVED]: {},
};

export function getVentureNextStatus(
  current: VentureStatus,
  event: VentureTransitionEvent,
): VentureStatus | undefined {
  return VENTURE_TRANSITIONS[current]?.[event];
}

export function isVentureTransitionAllowed(
  from: VentureStatus,
  to: VentureStatus,
): boolean {
  const allowed = VENTURE_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}

/** Doc 11 — ARCHIVED cannot resurrect to ACTIVE. */
export const INVALID_VENTURE_TRANSITIONS: ReadonlyArray<[VentureStatus, VentureStatus]> = [
  [VENTURE_STATUS.ARCHIVED, VENTURE_STATUS.ACTIVE],
  [VENTURE_STATUS.ARCHIVED, VENTURE_STATUS.PLANNED],
];

export function isInvalidVentureTransition(from: VentureStatus, to: VentureStatus): boolean {
  return INVALID_VENTURE_TRANSITIONS.some(([f, t]) => f === from && t === to);
}
