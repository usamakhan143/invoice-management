/**
 * Application-layer promotable text sanitization (F2).
 * Domain G-003 performs deterministic pattern checks on sanitized output.
 * Complete PII detection is not guaranteed here — gates block residual patterns.
 */

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g;

export interface SanitizePromotableTextResult {
  sanitized: string;
  hadPiiPatterns: boolean;
  replacements: number;
}

export function sanitizePromotableText(text: string): SanitizePromotableTextResult {
  let sanitized = text;
  let replacements = 0;

  sanitized = sanitized.replace(EMAIL_PATTERN, () => {
    replacements += 1;
    return "[REDACTED_EMAIL]";
  });

  sanitized = sanitized.replace(PHONE_PATTERN, () => {
    replacements += 1;
    return "[REDACTED_PHONE]";
  });

  return {
    sanitized,
    hadPiiPatterns: replacements > 0,
    replacements,
  };
}

export interface SanitizeEvidenceBundleInput {
  retrospectiveSummary: string;
  lessonTexts: readonly string[];
}

export interface SanitizedEvidenceBundleText {
  summaryText: string;
  lessonTexts: readonly string[];
  anySanitized: boolean;
}

export function sanitizeEvidenceBundleText(
  input: SanitizeEvidenceBundleInput,
): SanitizedEvidenceBundleText {
  const summary = sanitizePromotableText(input.retrospectiveSummary);
  const lessonTexts = input.lessonTexts.map((text) => sanitizePromotableText(text).sanitized);
  return {
    summaryText: summary.sanitized,
    lessonTexts,
    anySanitized:
      summary.hadPiiPatterns ||
      lessonTexts.length !== input.lessonTexts.length,
  };
}
