export type GateStatus = "gate_passed" | "gate_blocked" | "gate_deferred";

export interface GateEvaluation {
  readonly gateId: string;
  readonly status: GateStatus;
  readonly reasonCode: string;
  readonly message: string;
}

export interface GateResult {
  readonly overallStatus: GateStatus;
  readonly evaluations: readonly GateEvaluation[];
  readonly evaluatedAt: number;
  readonly gateRuleSetVersion: string;
  readonly mayEnterPendingReview: boolean;
}

export const LEARNING_GATE_RULE_SET_VERSION = "f1-gates-v1";

export function buildGateResult(
  evaluations: readonly GateEvaluation[],
  evaluatedAt: number,
): GateResult {
  const hasBlocked = evaluations.some((e) => e.status === "gate_blocked");
  const hasDeferred = evaluations.some((e) => e.status === "gate_deferred");
  const overallStatus: GateStatus = hasBlocked
    ? "gate_blocked"
    : hasDeferred
      ? "gate_deferred"
      : "gate_passed";

  return {
    overallStatus,
    evaluations: Object.freeze([...evaluations]),
    evaluatedAt,
    gateRuleSetVersion: LEARNING_GATE_RULE_SET_VERSION,
    mayEnterPendingReview: overallStatus === "gate_passed",
  };
}
