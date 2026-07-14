import type {
  AuditActor,
  AuditTimestamps,
  BosVentureId,
  CompanyId,
  UserId,
} from "../../types";
import type { VentureStatus } from "../../constants/ventureStatus";

/**
 * BosVenture — distinct business unit in the founder portfolio (Doc 10).
 *
 * Responsibilities:
 *   - Own strategic initiatives for one business line
 *   - Scope venture-level KPIs and decisions
 *   - Never represent CRM customer sub-entities (ERP:Business)
 *
 * Ownership:
 *   - Created/managed by Founder or Venture Lead (bos_ventures_manage)
 *   - Scoped to companyId tenant
 *
 * Lifecycle: Doc 11 §1 — see ventureLifecycle.ts
 */
export interface BosVenture extends AuditTimestamps, AuditActor {
  id: BosVentureId;
  companyId: CompanyId;
  name: string;
  description?: string;
  status: VentureStatus;
  /** Optional link to BosBusinessModel classification (Phase 2+). */
  businessModelId?: string;
  ownerUserId: UserId;
}

export interface CreateBosVentureInput {
  companyId: CompanyId;
  name: string;
  description?: string;
  ownerUserId: UserId;
  createdById: UserId;
}

export interface UpdateBosVentureInput {
  name?: string;
  description?: string;
  ownerUserId?: UserId;
  updatedById: UserId;
}
