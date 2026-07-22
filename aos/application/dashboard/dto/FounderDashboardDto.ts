import type { DeliveryState } from "../../../constants/deliveryState";
import type { KnowledgeListItemDto } from "../../knowledge/dto/KnowledgeDto";
import type { ModuleRegistryListItemDto } from "../../registry/dto/ModuleRegistryDto";

export type AttentionSeverity = "neutral" | "warning" | "error";

export type AttentionType =
  | "APPROVE_REQUIREMENTS"
  | "APPROVE_PROMPT_PACK"
  | "REVIEW_EVALUATION"
  | "COMPLETE_CAPTURE"
  | "RUN_REUSE_SCAN"
  | "QA_BLOCKED"
  | "RETROSPECTIVE_DUE"
  | "RISK_STALE"
  | "REVIEW_LEARNING";

export interface AttentionItemDto {
  id: string;
  type: AttentionType;
  severity: AttentionSeverity;
  actionLabel: string;
  engagementTitle: string;
  clientLabel: string;
  whyNow: string;
  tabHref: string;
  aiDraft: boolean;
  triggeredAt: number;
}

export interface NextBestActionDto {
  engagementId: string;
  engagementTitle: string;
  clientLabel: string;
  lifecycleState: DeliveryState;
  rationale: string;
  ctaLabel: string;
  tabHref: string;
  blockers: readonly string[];
}

export interface DeliveryRiskDto {
  id: string;
  message: string;
  severity: AttentionSeverity;
  evidenceHref: string;
  evidenceLabel: string;
}

export interface LifecycleCountDto {
  state: DeliveryState;
  label: string;
  count: number;
}

export interface PendingReviewsDto {
  requirements: number;
  prompts: number;
  evaluations: number;
  cursor: number;
  learning: number;
}

export interface DashboardInsightDto {
  id: string;
  message: string;
  aiGenerated: boolean;
}

export interface QuickActionDto {
  id: string;
  label: string;
  href: string;
}

export interface FounderDashboardDto {
  attentionQueue: readonly AttentionItemDto[];
  nextBestAction: NextBestActionDto | null;
  lifecycleCounts: readonly LifecycleCountDto[];
  risks: readonly DeliveryRiskDto[];
  evaluationAlerts: readonly AttentionItemDto[];
  pendingReviews: PendingReviewsDto;
  aiInsights: readonly DashboardInsightDto[];
  todaysFocus: string | null;
  upcomingCritical: readonly AttentionItemDto[];
  recentKnowledge: readonly KnowledgeListItemDto[];
  registryActivity: readonly ModuleRegistryListItemDto[];
  reuseOpportunities: readonly ModuleRegistryListItemDto[];
  quickActions: readonly QuickActionDto[];
  founderDecisionCards: readonly AttentionItemDto[];
}
