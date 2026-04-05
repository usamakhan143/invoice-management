import type firebase from "firebase/compat/app";

/**
 * Resolves the Firestore `companyId` used on leads/customers/invoices.
 * Owner: their Firebase uid is the company root. Team members: must use `users.companyId`
 * (owner uid) — never fall back to the member's uid or queries miss all company data.
 */
export function resolveCompanyIdForUser(
  user: firebase.User,
  userProfile: { isOwner?: boolean; companyId?: string } | null | undefined,
): string {
  if (userProfile?.isOwner) return user.uid;
  return (userProfile?.companyId ?? "").trim();
}
