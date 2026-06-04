export { LEAD_COUNTRY_OPTIONS } from "./leadCountries";
export { LEAD_SOURCE_PRESETS } from "./leadSources";

/** Sentinel for country / category dropdowns → show custom text field */
export const COUNTRY_CUSTOM_VALUE = "__country_custom__";
export const CATEGORY_CUSTOM_VALUE = "__category_custom__";
/** Sentinel for lead source searchable select → custom text field */
export const SOURCE_CUSTOM_VALUE = "__source_custom__";
/** Sentinel for reviews platform dropdown → custom text field */
export const REVIEWS_SOURCE_CUSTOM_VALUE = "__reviews_source_custom__";

/** Where public reviews are listed (lead form + import normalization) */
export const LEAD_REVIEWS_SOURCE_PRESETS = [
  "Google",
  "Google Business Profile",
  "Trustpilot",
  "Facebook",
  "Yelp",
  "G2",
  "Capterra",
  "App Store",
  "Play Store",
  "Better Business Bureau",
  "TripAdvisor",
  "Amazon",
  "Other",
] as const;

export function splitStoredReviewsSource(raw?: string | null): { select: string; custom: string } {
  const t = (raw || "").trim();
  if (!t) return { select: "", custom: "" };
  const preset = (LEAD_REVIEWS_SOURCE_PRESETS as readonly string[]).find(
    (p) => p.toLowerCase() === t.toLowerCase(),
  );
  if (preset) return { select: preset, custom: "" };
  return { select: REVIEWS_SOURCE_CUSTOM_VALUE, custom: t };
}

export function resolvedReviewsSource(select: string, custom: string): string {
  if (select === REVIEWS_SOURCE_CUSTOM_VALUE) return custom.trim();
  return select.trim();
}

/**
 * Simple industry / business types — good for selling digital services or products online.
 * Kept short; use CATEGORY_CUSTOM_VALUE + custom field for anything else.
 */
export const LEAD_CATEGORY_PRESETS = [
  "Accounting / bookkeeping",
  "Advertising / media",
  "Agriculture / agtech",
  "AI / data / analytics",
  "Architecture / interior design",
  "Automotive / parts",
  "B2B services",
  "Beauty / cosmetics",
  "Cannabis / Hemp industry",
  "Car rental",
  "Cleaning service",
  "Cloud / hosting / domains",
  "Coaching / consulting",
  "Construction / trades",
  "Creators / influencers",
  "Cybersecurity",
  "Dental",
  "Digital marketing / SEO",
  "Dropshipping",
  "E-commerce / online store",
  "Education / online courses",
  "Electronics / gadgets",
  "Energy / utilities",
  "Events / ticketing",
  "Fashion / apparel",
  "Finance / fintech",
  "Fitness / gym",
  "Food delivery / cloud kitchen",
  "Games / entertainment software",
  "Government / public sector",
  "Graphic design / branding",
  "Health / wellness products",
  "Home / furniture / decor",
  "Hotels / hospitality",
  "HR / recruiting",
  "Industrial / equipment",
  "Insurance",
  "Investment / wealth",
  "IT services / MSP",
  "Kids / toys",
  "Legal services",
  "Logistics / shipping",
  "Manufacturing",
  "Marketplace / platform",
  "Medical / clinic",
  "Membership / subscriptions",
  "Mental health / therapy",
  "Mobile apps",
  "Music / arts",
  "News / media",
  "Non-profit / charity",
  "Pets / pet products",
  "Pharmacy / supplements",
  "Photography / video",
  "Podcast / streaming",
  "Printing / merchandise",
  "Professional services",
  "Property management",
  "Publishing",
  "Real estate",
  "Restaurant / cafe / food",
  "Retail (physical store)",
  "SaaS / software",
  "Social media / content",
  "Sports / sports tech",
  "Translation / localization",
  "Transport / fleet",
  "Travel / tourism",
  "Trucking company",
  "Virtual assistant / back-office",
  "Voice / contact center",
  "Web design / development",
  "Wholesale / distribution",
] as const;
