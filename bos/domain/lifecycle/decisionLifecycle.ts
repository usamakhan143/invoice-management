import { DECISION_STATUS, type DecisionStatus } from "../../constants/decisionStatus";

export type DecisionTransitionEvent =
  | "approve"
  | "activate"
  | "supersede"
  | "revoke"
  | "evaluate";

const DECISION_TRANSITIONS: Record<
  DecisionStatus,
  Partial<Record<DecisionTransitionEvent, DecisionStatus>>
> = {
  [DECISION_STATUS.PROPOSED]: {
    approve: DECISION_STATUS.APPROVED,
    activate: DECISION_STATUS.ACTIVE,
  },
  [DECISION_STATUS.APPROVED]: {
    activate: DECISION_STATUS.ACTIVE,
  },
  [DECISION_STATUS.ACTIVE]: {
    supersede: DECISION_STATUS.SUPERSEDED,
    revoke: DECISION_STATUS.REVOKED,
    evaluate: DECISION_STATUS.EVALUATED,
  },
  [DECISION_STATUS.SUPERSEDED]: {},
  [DECISION_STATUS.REVOKED]: {},
  [DECISION_STATUS.EVALUATED]: {},
};

export function getDecisionNextStatus(
  current: DecisionStatus,
  event: DecisionTransitionEvent,
): DecisionStatus | undefined {
  return DECISION_TRANSITIONS[current]?.[event];
}

export function isDecisionTransitionAllowed(from: DecisionStatus, to: DecisionStatus): boolean {
  const allowed = DECISION_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}

/** Doc 11 — decisions are never deleted. */
export const DECISION_DELETE_FORBIDDEN = true as const;
