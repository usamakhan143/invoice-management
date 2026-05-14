/**
 * Whether a lead's phone field matches a free-text search query.
 * Supports formatted numbers (substring) and digit-only / mixed queries
 * (e.g. leading zeros vs international format).
 */
export function leadPhoneMatchesSearch(leadPhone: string | undefined, rawQuery: string): boolean {
  const q = rawQuery.trim();
  if (!q) return true;
  const raw = (leadPhone || "").trim();
  if (!raw) return false;
  if (raw.toLowerCase().includes(q.toLowerCase())) return true;

  const qd = q.replace(/\D/g, "");
  if (qd.length < 2) return false;
  const ld = raw.replace(/\D/g, "");
  if (!ld) return false;
  if (ld.includes(qd)) return true;

  const qNoLeadingZeros = qd.replace(/^0+/, "") || qd;
  if (qNoLeadingZeros.length >= 2 && ld.includes(qNoLeadingZeros)) return true;

  if (qd.length >= 7) {
    if (ld.endsWith(qd) || ld.endsWith(qNoLeadingZeros)) return true;
  }
  return false;
}
