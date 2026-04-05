import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";
import { COUNTRY_NAME_TO_ISO } from "../config/countryNameToPhoneIso";

/** ITU E.164 maximum digits (country code + national significant number). */
const MAX_E164_DIGITS = 15;

/**
 * Drop trailing digits while lib reports TOO_LONG, then enforce E.164 max digit count.
 * `stripped` must contain only `+` and digits (as from `replace(/[^\d+]/g, "")`).
 */
function clampStrippedPhoneLength(stripped: string, countryIso?: CountryCode): string {
  if (!stripped || stripped === "+") return stripped;

  let s = stripped;

  if (s.startsWith("+") || countryIso) {
    while (s.length > 1) {
      const reason = s.startsWith("+")
        ? validatePhoneNumberLength(s)
        : countryIso
          ? validatePhoneNumberLength(s, countryIso)
          : undefined;
      if (reason !== "TOO_LONG") break;
      const next = s.slice(0, -1);
      if (next.length === s.length) break;
      s = next;
    }
  }

  const hasPlus = s.startsWith("+");
  const allDigits = s.replace(/\D/g, "");
  if (allDigits.length <= MAX_E164_DIGITS) return s;
  const cut = allDigits.slice(0, MAX_E164_DIGITS);
  return hasPlus ? `+${cut}` : cut;
}

export function getIsoFromLeadCountryName(
  countryName: string | undefined | null,
): CountryCode | undefined {
  if (!countryName?.trim()) return undefined;
  return COUNTRY_NAME_TO_ISO[countryName.trim()];
}

export function defaultPrefixForCountry(countryIso: CountryCode | undefined): string {
  if (!countryIso) return "";
  try {
    return `+${getCountryCallingCode(countryIso)} `;
  } catch {
    return "";
  }
}

/** True if the value is only the calling code digits (optional +), no subscriber number. */
export function isBareCountryCallingCode(input: string, countryIso: CountryCode): boolean {
  try {
    const cc = getCountryCallingCode(countryIso);
    const digits = input.replace(/\D/g, "");
    return digits === cc;
  } catch {
    return false;
  }
}

/**
 * Format while typing / pasting: adds spaces per libphonenumber rules.
 * If input starts with +, uses international AsYouType; else uses default country when provided.
 */
export function formatPhoneAsYouType(input: string, countryIso?: CountryCode): string {
  const stripped = clampStrippedPhoneLength(input.replace(/[^\d+]/g, ""), countryIso);
  const treatAsInternational = stripped.startsWith("+");
  const ayt = treatAsInternational
    ? new AsYouType()
    : countryIso
      ? new AsYouType(countryIso)
      : new AsYouType();
  ayt.reset();
  for (const ch of stripped) {
    ayt.input(ch);
  }
  const parsed = ayt.getNumber();
  if (parsed) {
    return parsed.formatInternational();
  }
  return ayt.getChars();
}

/** Best-effort pretty international format when loading saved numbers. */
export function formatPhoneForDisplay(raw: string, countryIso?: CountryCode): string {
  const t = raw.trim();
  if (!t) return countryIso ? defaultPrefixForCountry(countryIso) : "";
  const stripped = clampStrippedPhoneLength(t.replace(/[^\d+]/g, ""), countryIso);
  if (!stripped || stripped === "+") return countryIso ? defaultPrefixForCountry(countryIso) : stripped || "";
  const pn = countryIso
    ? parsePhoneNumberFromString(stripped, countryIso)
    : parsePhoneNumberFromString(stripped);
  if (pn?.isValid()) return pn.formatInternational();
  if (pn) return pn.formatInternational();
  return formatPhoneAsYouType(t, countryIso);
}
