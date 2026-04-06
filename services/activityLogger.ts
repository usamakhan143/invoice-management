import { db, Timestamp } from "./firebase";
import { resolveCompanyIdForUser } from "./companyId";
import type { ActivityType, Activity } from "../types";
import type firebase from "firebase/compat/app";

export class ActivityLogger {
  static async logActivity(
    user: firebase.User,
    userProfile: any,
    type: ActivityType,
    description: string,
    metadata?: Activity["metadata"],
  ): Promise<void> {
    try {
      // Use proper user ID and company ID resolution
      const actualUserId = userProfile?.uid || user.uid;
      const companyId = resolveCompanyIdForUser(user, userProfile);

      if (!companyId) {
        console.warn("Cannot log activity: Company ID not found");
        return;
      }

      const activity: Omit<Activity, "id"> = {
        userId: actualUserId,
        userEmail: userProfile?.email || user.email || "",
        userName:
          userProfile?.displayName ||
          userProfile?.companyName ||
          user.email ||
          "Unknown User",
        companyId,
        type,
        description,
        timestamp: Timestamp.now(),
      };

      // Only add metadata if it's defined (Firestore doesn't accept undefined)
      if (metadata) {
        activity.metadata = metadata;
      }


      await db.collection("activities").add(activity);
    } catch (error) {
      console.error("Failed to log activity:", error);
      // Don't throw error to avoid disrupting main app flow
    }
  }

  static async getUserActivities(
    userId: string,
    limit: number = 50,
  ): Promise<Activity[]> {
    try {
      const snapshot = await db
        .collection("activities")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[];
    } catch (error) {
      console.error("Failed to fetch user activities:", error);
      return [];
    }
  }

  static async getCompanyActivities(
    companyId: string,
    limit: number = 100,
  ): Promise<Activity[]> {
    try {
      const snapshot = await db
        .collection("activities")
        .where("companyId", "==", companyId)
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[];
    } catch (error) {
      console.error("Failed to fetch company activities:", error);
      return [];
    }
  }

  /** Delete activity documents by id (Firestore batch, chunks of 400). */
  static async deleteActivitiesByIds(activityIds: string[]): Promise<void> {
    if (activityIds.length === 0) return;
    const chunkSize = 400;
    for (let i = 0; i < activityIds.length; i += chunkSize) {
      const chunk = activityIds.slice(i, i + chunkSize);
      const batch = db.batch();
      chunk.forEach((id) => batch.delete(db.collection("activities").doc(id)));
      await batch.commit();
    }
  }

  static getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      invoice_created: "📄",
      invoice_updated: "✏️",
      invoice_deleted: "🗑️",
      customer_created: "👤",
      customer_updated: "✏️",
      customer_deleted: "🗑️",
      business_created: "🏢",
      business_updated: "✏️",
      business_deleted: "🗑️",
      product_created: "📦",
      product_updated: "✏️",
      product_deleted: "🗑️",
      bank_account_created: "🏦",
      bank_account_updated: "✏️",
      bank_account_deleted: "🗑️",
      expense_created: "💸",
      expense_updated: "✏️",
      expense_deleted: "🗑️",
      user_created: "👥",
      user_updated: "✏️",
      user_deleted: "🗑️",
      login: "🔐",
      logout: "🚪",
      lead_created: "📋",
      lead_updated: "✏️",
      lead_deleted: "🗑️",
      lead_call_logged: "📞",
      lead_assigned: "👤",
      lead_converted: "✅",
      lead_linked_customer: "🔗",
    };
    return icons[type] || "📋";
  }

  static getActivityColor(type: ActivityType): string {
    if (type.includes("created")) return "text-green-600";
    if (type.includes("updated")) return "text-blue-600";
    if (type.includes("deleted")) return "text-red-600";
    if (type === "login") return "text-green-600";
    if (type === "logout") return "text-gray-600";
    return "text-gray-600";
  }
}
