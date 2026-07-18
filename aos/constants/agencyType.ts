/**
 * Agency type profile — frozen domain model §01 BR-DE-02.
 * @see docs/aos-domain-model/01_DELIVERY_DOMAIN.md
 */

export const AGENCY_TYPE = {
  WEB: "web",
  MOBILE: "mobile",
  AI: "ai",
  SAAS: "saas",
} as const;

export type AgencyType = (typeof AGENCY_TYPE)[keyof typeof AGENCY_TYPE];

export const AGENCY_TYPE_LABELS: Record<AgencyType, string> = {
  [AGENCY_TYPE.WEB]: "Web",
  [AGENCY_TYPE.MOBILE]: "Mobile",
  [AGENCY_TYPE.AI]: "AI",
  [AGENCY_TYPE.SAAS]: "SaaS",
};

export const AGENCY_TYPES: readonly AgencyType[] = Object.values(AGENCY_TYPE);
