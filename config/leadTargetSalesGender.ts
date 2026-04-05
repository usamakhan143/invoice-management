/** Stored on leads for routing / list filters (e.g. assign to female vs male sales agents). */
export const TARGET_SALES_GENDER = {
  ANY: "any",
  FEMALE: "female",
  MALE: "male",
} as const;

export type LeadTargetSalesGender = (typeof TARGET_SALES_GENDER)[keyof typeof TARGET_SALES_GENDER];

export const LEAD_TARGET_SALES_GENDER_OPTIONS: { value: LeadTargetSalesGender; label: string }[] = [
  { value: TARGET_SALES_GENDER.ANY, label: "Any (no preference)" },
  { value: TARGET_SALES_GENDER.FEMALE, label: "Female sales agent" },
  { value: TARGET_SALES_GENDER.MALE, label: "Male sales agent" },
];

export function normalizeLeadTargetSalesGender(v: unknown): LeadTargetSalesGender {
  if (v === TARGET_SALES_GENDER.FEMALE || v === TARGET_SALES_GENDER.MALE) return v;
  return TARGET_SALES_GENDER.ANY;
}
