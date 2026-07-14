import type { BankAccount, UserProfile } from "../types";

export function normalizeRestrictedBankAccountIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

/** Accounts hidden from form dropdowns for this user (owner sees all). */
export function filterBankAccountsForUser(
  accounts: BankAccount[],
  userProfile: Pick<UserProfile, "isOwner" | "restrictedBankAccountIds"> | null | undefined,
): BankAccount[] {
  if (!userProfile || userProfile.isOwner) return accounts;
  const restricted = normalizeRestrictedBankAccountIds(
    userProfile.restrictedBankAccountIds,
  );
  if (restricted.length === 0) return accounts;
  const hidden = new Set(restricted);
  return accounts.filter((a) => !hidden.has(a.id));
}
