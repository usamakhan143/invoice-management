/**
 * Cross-entity relationship model — frozen delivery domain.
 * Describes cardinality and forbidden aliases; persistence implements FKs only.
 */

import type { CompanyId } from "../../types";
import type { DeliveryEngagementId, DeliveryTemplateId } from "./valueObjects";

/** Forbidden merges — BOS initiative ≠ delivery engagement. */
export const FORBIDDEN_AOS_ALIASES = {
  deliveryEngagement: ["project", "projects", "task", "tasks", "sprint", "sprints", "backlog"],
  requirementSet: ["backlog", "user_story", "story"],
} as const;

export interface EngagementCustomerLink {
  engagementId: DeliveryEngagementId;
  erpCustomerId: string;
  companyId: CompanyId;
}

export interface EngagementInitiativeLink {
  engagementId: DeliveryEngagementId;
  bosInitiativeId: string;
  companyId: CompanyId;
}

export interface EngagementTemplateLink {
  engagementId: DeliveryEngagementId;
  templateId: DeliveryTemplateId;
  appliedTemplateVersion: number;
}
