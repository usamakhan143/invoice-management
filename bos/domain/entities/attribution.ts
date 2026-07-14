import type {
  AuditActor,
  AuditTimestamps,
  BosAttributionId,
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  CurrencyCode,
  EpochMs,
  Percentage,
  UserId,
} from "../../types";
import type { AttributionSourceType } from "../../constants/attributionSourceType";
import type { AttributionStatus } from "../../constants/attributionStatus";

/**
 * BosAttribution — sidecar linking ERP facts to BOS context (Doc 10).
 *
 * Responsibilities:
 *   - Link sourceType + sourceId to initiative (and venture)
 *   - Optional allocation percentage for split attributions
 *   - NEVER modify ERP source documents (sidecar law)
 *
 * Ownership:
 *   - Finance Operator (bos_attributions_manage)
 *   - Void/dispute (bos_attributions_void)
 *
 * Lifecycle: Doc 11 §5 — see attributionLifecycle.ts
 *
 * Phase: 1B — domain defined in Sprint 1; persistence/UI in Phase 1B.
 */
export interface BosAttribution extends AuditTimestamps, AuditActor {
  id: BosAttributionId;
  companyId: CompanyId;
  initiativeId: BosInitiativeId;
  ventureId: BosVentureId;
  sourceType: AttributionSourceType;
  /** ERP document id or manual entry key — never written onto ERP doc. */
  sourceId: string;
  status: AttributionStatus;
  allocationPercent: Percentage;
  /** Snapshot at attribution time for audit — not authoritative ledger. */
  amountSnapshot?: number;
  currencySnapshot?: CurrencyCode;
  notes?: string;
  attributedById: UserId;
  supersededById?: BosAttributionId;
  voidReason?: string;
  disputedAt?: EpochMs;
  resolvedAt?: EpochMs;
}

export interface CreateBosAttributionInput {
  companyId: CompanyId;
  initiativeId: BosInitiativeId;
  ventureId: BosVentureId;
  sourceType: AttributionSourceType;
  sourceId: string;
  allocationPercent: Percentage;
  amountSnapshot?: number;
  currencySnapshot?: CurrencyCode;
  notes?: string;
  attributedById: UserId;
  createdById: UserId;
}

export interface SupersedeBosAttributionInput {
  supersededById: BosAttributionId;
  updatedById: UserId;
}

export interface VoidBosAttributionInput {
  voidReason: string;
  updatedById: UserId;
}

/** Composite key for idempotency checks in repositories. */
export interface AttributionSourceRef {
  companyId: CompanyId;
  sourceType: AttributionSourceType;
  sourceId: string;
}
