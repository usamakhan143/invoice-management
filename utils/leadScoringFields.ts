/** Shared parsing / clamping for lead score (0–100), reviews count, rating (0–5). */

export function clampLeadScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function clampReviewRating(n: number): number {
  return Math.min(5, Math.max(0, Math.round(n * 10) / 10));
}

export function parseOptionalLeadScoreInput(
  raw: string,
): { ok: true; value?: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true };
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    return { ok: false, message: "Lead score must be a number between 0 and 100." };
  }
  if (n < 0 || n > 100) {
    return { ok: false, message: "Lead score must be between 0 and 100." };
  }
  return { ok: true, value: clampLeadScore(n) };
}

export function parseOptionalReviewsCountInput(
  raw: string,
): { ok: true; value?: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true };
  if (!/^\d+$/.test(t)) {
    return { ok: false, message: "Reviews count must be a whole number (0 or more)." };
  }
  const n = Number(t);
  return { ok: true, value: n };
}

export function parseOptionalReviewRatingInput(
  raw: string,
): { ok: true; value?: number } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true };
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    return { ok: false, message: "Review rating must be a number between 0 and 5." };
  }
  if (n < 0 || n > 5) {
    return { ok: false, message: "Review rating must be between 0 and 5." };
  }
  return { ok: true, value: clampReviewRating(n) };
}
