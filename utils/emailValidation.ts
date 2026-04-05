/**
 * Practical email shape check for forms (not a full RFC parser).
 * Rejects obvious non-emails; requires domain with a dot and a 2+ letter TLD.
 */
export function isValidEmailAddress(email: string): boolean {
  const t = email.trim();
  if (!t || t.length > 254) return false;

  const parts = t.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || local.length > 64) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (!/^[a-zA-Z0-9._%+-]+$/.test(local)) return false;

  if (!domain || domain.length > 253 || !domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/i.test(label)) return false;
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/i.test(tld)) return false;

  return true;
}
