/**
 * Super Admin safety boundary (platform operator UI under /super-admin).
 *
 * Read paths: `AdminAnalyticsService`, dashboard tables, and billing views only
 * query Firestore — they do not modify tenant invoices, customers, or profiles.
 *
 * Write paths: Today only `subscriptionPlans` CRUD in SubscriptionPlansManager.
 * Future Super Admin features that call `set`, `update`, `delete`, or `batch.commit`
 * on any collection must either:
 * - Check `SUPER_ADMIN_FIRESTORE_WRITES_ENABLED`, or
 * - Call `assertSuperAdminFirestoreWritesAllowed()` before the first write in that flow.
 *
 * Default: writes OFF unless `VITE_SUPER_ADMIN_FIRESTORE_WRITES=true` in `.env`.
 * This keeps core app behaviour unchanged and avoids accidental catalog/data changes
 * when shipping new Super Admin code.
 */
export const SUPER_ADMIN_FIRESTORE_WRITES_ENABLED =
  import.meta.env.VITE_SUPER_ADMIN_FIRESTORE_WRITES === "true";

export function assertSuperAdminFirestoreWritesAllowed(): void {
  if (!SUPER_ADMIN_FIRESTORE_WRITES_ENABLED) {
    throw new Error(
      "Super Admin Firestore writes are disabled. Set VITE_SUPER_ADMIN_FIRESTORE_WRITES=true in .env only when you intend to change platform documents.",
    );
  }
}
