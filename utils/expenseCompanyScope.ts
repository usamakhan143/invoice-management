import type firebase from "firebase/compat/app";
import { db } from "../services/firebase";
import type { UserProfile } from "../types";

const BACKFILL_SESSION_PREFIX = "expense_company_id_backfill_";

/** Company owner uid used for company-scoped expense queries */
export function getExpenseCompanyId(
  user: firebase.User,
  userProfile: UserProfile,
): string {
  if (userProfile.isOwner === true) return user.uid;
  return (userProfile.companyId || "").trim();
}

export function useCompanyWideExpenseQuery(
  isOwner: boolean,
  canManageCompanyExpenses: boolean,
): boolean {
  return isOwner === true || canManageCompanyExpenses === true;
}

/**
 * One-time per-tab backfill: set `companyId` on legacy expense docs so company queries work.
 * Safe for small/medium teams (chunks userIds with Firestore `in` limit 30).
 */
export async function backfillExpenseCompanyIdsIfNeeded(
  companyId: string,
): Promise<void> {
  if (!companyId || typeof sessionStorage === "undefined") return;
  const key = `${BACKFILL_SESSION_PREFIX}${companyId}`;
  if (sessionStorage.getItem(key) === "1") return;

  try {
    const uids = new Set<string>([companyId]);
    const team = await db
      .collection("companyUsers")
      .where("companyId", "==", companyId)
      .get();
    team.docs.forEach((d) => {
      const u = (d.data() as { uid?: string }).uid;
      if (u && typeof u === "string") uids.add(u.trim());
    });

    const list = [...uids].filter(Boolean);
    const chunkSize = 30;

    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      const snap = await db
        .collection("expenses")
        .where("userId", "in", chunk)
        .get();

      const batch = db.batch();
      let writes = 0;
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as { companyId?: string };
        if (!data.companyId) {
          batch.update(docSnap.ref, { companyId });
          writes += 1;
        }
      });
      if (writes > 0) {
        await batch.commit();
      }
    }

    sessionStorage.setItem(key, "1");
  } catch (e) {
    console.warn("Expense companyId backfill skipped:", e);
  }
}
