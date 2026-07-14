import type {
  AuditActor,
  AuditTimestamps,
  BosDecisionId,
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  EpochMs,
  UserId,
} from "../../types";
import type { DecisionStatus, DecisionType } from "../../constants/decisionStatus";

/**
 * BosDecision — recorded strategic choice with institutional memory (Doc 10, Doc 13).
 *
 * Responsibilities:
 *   - Capture context, rationale, alternatives, expected vs actual outcomes
 *   - Link to initiative and/or venture
 *   - Never deleted — supersede or revoke instead
 *
 * Ownership:
 *   - Founder / Venture Lead (bos_decisions_manage)
 *   - Approve/supersede elevated (bos_decisions_supersede)
 *
 * Lifecycle: Doc 11 §7 — see decisionLifecycle.ts
 */
export interface BosDecisionAlternative {
  id: string;
  title: string;
  description?: string;
  rejectedReason?: string;
}

export interface BosDecision extends AuditTimestamps, AuditActor {
  id: BosDecisionId;
  companyId: CompanyId;
  ventureId?: BosVentureId;
  initiativeId?: BosInitiativeId;
  title: string;
  context?: string;
  decision: string;
  decisionType: DecisionType;
  status: DecisionStatus;
  alternatives?: BosDecisionAlternative[];
  expectedOutcome?: string;
  actualOutcome?: string;
  decidedAt?: EpochMs;
  decidedById?: UserId;
  evaluatedAt?: EpochMs;
  supersedesDecisionId?: BosDecisionId;
}

export interface CreateBosDecisionInput {
  companyId: CompanyId;
  ventureId?: BosVentureId;
  initiativeId?: BosInitiativeId;
  title: string;
  context?: string;
  decision: string;
  decisionType: DecisionType;
  /** When the business decision was actually made (business date). */
  decidedAt: EpochMs;
  expectedOutcome?: string;
  alternatives?: BosDecisionAlternative[];
  createdById: UserId;
}

export interface UpdateBosDecisionInput {
  title?: string;
  context?: string;
  decision?: string;
  decisionType?: DecisionType;
  /** When the business decision was actually made (business date). */
  decidedAt?: EpochMs;
  expectedOutcome?: string;
  actualOutcome?: string;
  updatedById: UserId;
}

export interface EvaluateBosDecisionInput {
  actualOutcome: string;
  evaluatedById: UserId;
}
