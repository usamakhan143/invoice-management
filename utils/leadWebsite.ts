import type { Lead } from "../types";

/** True when `extras.website` has a non-empty value (trimmed). */
export function leadHasWebsiteUrl(lead: Lead): boolean {
  return !!(lead.extras?.website || "").trim();
}
