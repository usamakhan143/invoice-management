import { ATTRIBUTION_STATUS, type AttributionStatus } from "../../constants/attributionStatus";

export type AttributionTransitionEvent = "supersede" | "dispute" | "resolve" | "void";

const ATTRIBUTION_TRANSITIONS: Record<
  AttributionStatus,
  Partial<Record<AttributionTransitionEvent, AttributionStatus>>
> = {
  [ATTRIBUTION_STATUS.ACTIVE]: {
    supersede: ATTRIBUTION_STATUS.SUPERSEDED,
    dispute: ATTRIBUTION_STATUS.DISPUTED,
    void: ATTRIBUTION_STATUS.VOID,
  },
  [ATTRIBUTION_STATUS.DISPUTED]: {
    resolve: ATTRIBUTION_STATUS.ACTIVE,
    void: ATTRIBUTION_STATUS.VOID,
  },
  [ATTRIBUTION_STATUS.SUPERSEDED]: {},
  [ATTRIBUTION_STATUS.VOID]: {},
};

export function getAttributionNextStatus(
  current: AttributionStatus,
  event: AttributionTransitionEvent,
): AttributionStatus | undefined {
  return ATTRIBUTION_TRANSITIONS[current]?.[event];
}

export function isAttributionTransitionAllowed(
  from: AttributionStatus,
  to: AttributionStatus,
): boolean {
  const allowed = ATTRIBUTION_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}

/** Doc 11 — physical delete forbidden; void instead. */
export const ATTRIBUTION_DELETE_FORBIDDEN = true as const;
