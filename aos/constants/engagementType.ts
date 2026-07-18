/**
 * Engagement type — frozen domain model §01 BR-DE-03.
 * @see docs/aos-domain-model/01_DELIVERY_DOMAIN.md
 */

export const ENGAGEMENT_TYPE = {
  GREENFIELD: "greenfield",
  ENHANCEMENT: "enhancement",
  MAINTENANCE: "maintenance",
  MIGRATION: "migration",
} as const;

export type EngagementType = (typeof ENGAGEMENT_TYPE)[keyof typeof ENGAGEMENT_TYPE];

export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  [ENGAGEMENT_TYPE.GREENFIELD]: "Greenfield",
  [ENGAGEMENT_TYPE.ENHANCEMENT]: "Enhancement",
  [ENGAGEMENT_TYPE.MAINTENANCE]: "Maintenance",
  [ENGAGEMENT_TYPE.MIGRATION]: "Migration",
};

export const ENGAGEMENT_TYPES: readonly EngagementType[] = Object.values(ENGAGEMENT_TYPE);
