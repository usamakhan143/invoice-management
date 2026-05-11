import { db, Timestamp } from "./firebase";
import type { ExpenseCategory } from "../types";

/** Former hardcoded list — seeded once per company when the directory is empty. */
export const DEFAULT_EXPENSE_CATEGORY_NAMES = [
  "Office Supplies",
  "Marketing",
  "Travel",
  "Utilities",
  "Software & Tools",
  "Equipment",
  "Professional Services",
  "Training & Education",
  "Rent",
  "Insurance",
  "Food & Entertainment",
  "Other",
];

const seedingCompanies = new Set<string>();

/**
 * First time a company has zero category docs, seed defaults (transaction + batch).
 * Rolls back the init marker if the batch fails so a later retry can run.
 */
export async function ensureDefaultExpenseCategoriesOnce(
  companyId: string,
): Promise<void> {
  if (!companyId || seedingCompanies.has(companyId)) return;
  seedingCompanies.add(companyId);
  const initRef = db.collection("expenseCategoryInit").doc(companyId);
  try {
    const shouldSeed = await db.runTransaction(async (tx) => {
      const s = await tx.get(initRef);
      if (s.exists) return false;
      tx.set(initRef, { createdAt: Timestamp.now() });
      return true;
    });
    if (!shouldSeed) return;

    const batch = db.batch();
    DEFAULT_EXPENSE_CATEGORY_NAMES.forEach((name, i) => {
      const ref = db.collection("expenseCategories").doc();
      batch.set(ref, {
        companyId,
        name,
        sortOrder: i,
        createdAt: Timestamp.now(),
      });
    });
    await batch.commit();
  } catch (e) {
    console.error("ensureDefaultExpenseCategoriesOnce:", e);
    try {
      await initRef.delete();
    } catch {
      /* ignore */
    }
  } finally {
    seedingCompanies.delete(companyId);
  }
}

export function subscribeCompanyExpenseCategories(
  companyId: string,
  onUpdate: (rows: ExpenseCategory[]) => void,
): () => void {
  if (!companyId) {
    onUpdate([]);
    return () => {};
  }
  return db
    .collection("expenseCategories")
    .where("companyId", "==", companyId)
    .onSnapshot(
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ExpenseCategory,
        );
        rows.sort((a, b) => {
          const ao = Number(a.sortOrder) || 0;
          const bo = Number(b.sortOrder) || 0;
          if (ao !== bo) return ao - bo;
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });
        onUpdate(rows);
        if (rows.length === 0) {
          void ensureDefaultExpenseCategoriesOnce(companyId);
        }
      },
      (err) => {
        console.error("Expense categories listener error:", err);
        onUpdate([]);
      },
    );
}

/** Updates expense rows that still use the old category label (same company). */
export async function renameCategoryOnExpenses(
  companyId: string,
  oldName: string,
  newName: string,
): Promise<number> {
  if (!companyId || !oldName || !newName || oldName === newName) return 0;
  const snap = await db
    .collection("expenses")
    .where("companyId", "==", companyId)
    .where("category", "==", oldName)
    .get();

  let updated = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((d) => {
      batch.update(d.ref, { category: newName });
      updated += 1;
    });
    await batch.commit();
  }
  return updated;
}
