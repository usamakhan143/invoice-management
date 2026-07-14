import {
  INITIATIVE_CLOSURE_OUTCOME,
  INITIATIVE_STATUS,
  type InitiativeClosureOutcome,
  type InitiativeStatus,
} from "../../constants/initiativeStatus";

export type InitiativeTransitionEvent =
  | "activate"
  | "pause"
  | "resume"
  | "close"
  | "cancel"
  | "pivot";

const INITIATIVE_TRANSITIONS: Record<
  InitiativeStatus,
  Partial<Record<InitiativeTransitionEvent, InitiativeStatus>>
> = {
  [INITIATIVE_STATUS.DRAFT]: {
    activate: INITIATIVE_STATUS.ACTIVE,
    cancel: INITIATIVE_STATUS.CLOSED,
  },
  [INITIATIVE_STATUS.ACTIVE]: {
    pause: INITIATIVE_STATUS.PAUSED,
    close: INITIATIVE_STATUS.CLOSED,
    pivot: INITIATIVE_STATUS.CLOSED,
  },
  [INITIATIVE_STATUS.PAUSED]: {
    resume: INITIATIVE_STATUS.ACTIVE,
    close: INITIATIVE_STATUS.CLOSED,
  },
  [INITIATIVE_STATUS.CLOSED]: {},
};

export function getInitiativeNextStatus(
  current: InitiativeStatus,
  event: InitiativeTransitionEvent,
): InitiativeStatus | undefined {
  return INITIATIVE_TRANSITIONS[current]?.[event];
}

export function isInitiativeTransitionAllowed(
  from: InitiativeStatus,
  to: InitiativeStatus,
): boolean {
  const allowed = INITIATIVE_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}

/** Closure outcome hints per transition event (Doc 11). */
export function closureOutcomeForEvent(
  event: InitiativeTransitionEvent,
): InitiativeClosureOutcome | undefined {
  if (event === "cancel") return INITIATIVE_CLOSURE_OUTCOME.KILLED;
  if (event === "pivot") return INITIATIVE_CLOSURE_OUTCOME.PIVOTED;
  return undefined;
}

export const INVALID_INITIATIVE_TRANSITIONS: ReadonlyArray<[InitiativeStatus, InitiativeStatus]> =
  [[INITIATIVE_STATUS.CLOSED, INITIATIVE_STATUS.ACTIVE]];

export function isInvalidInitiativeTransition(
  from: InitiativeStatus,
  to: InitiativeStatus,
): boolean {
  return INVALID_INITIATIVE_TRANSITIONS.some(([f, t]) => f === from && t === to);
}
