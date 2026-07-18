/**
 * Immutable version status — frozen domain model (mutable head / published versions).
 * @see docs/aos-domain-model/00_DOMAIN_MODEL_INDEX.md
 */

export const VERSION_STATUS = {
  PUBLISHED: "published",
} as const;

export type VersionStatus = (typeof VERSION_STATUS)[keyof typeof VERSION_STATUS];

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  [VERSION_STATUS.PUBLISHED]: "Published",
};
