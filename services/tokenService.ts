import { db, Timestamp } from "./firebase";
import type firebase from "firebase/compat/app";

interface UserToken {
  id?: string;
  userId: string;
  userEmail?: string;
  token: string;
  deviceInfo: string;
  userAgent: string;
  ipAddress?: string;
  createdAt: any;
  lastActiveAt: any;
  isActive: boolean;
}

class TokenService {
  /** Firestore doc id for a session row — avoids collection queries (list rules / watch quirks). */
  static tokenDocumentId(userId: string, token: string): string {
    return `${userId}_${token}`;
  }

  private static generateToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }

  private static getDeviceInfo(): string {
    const userAgent = navigator.userAgent;
    let deviceInfo = "Unknown Device";

    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceInfo = "Mobile Device";
    } else if (/Windows/.test(userAgent)) {
      deviceInfo = "Windows PC";
    } else if (/Mac/.test(userAgent)) {
      deviceInfo = "Mac";
    } else if (/Linux/.test(userAgent)) {
      deviceInfo = "Linux";
    }

    return deviceInfo;
  }

  static async createUserToken(user: firebase.User): Promise<string> {
    try {
      const token = this.generateToken();
      const deviceInfo = this.getDeviceInfo();
      const userAgent = navigator.userAgent;



      const tokenData: Omit<UserToken, 'id'> = {
        userId: user.uid, // Firebase Auth UID
        userEmail: user.email || '', // Store email for easier searching
        token,
        deviceInfo,
        userAgent,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
        isActive: true,
      };

      // Deterministic id so reads use doc.get (not list queries) — matches security rules reliably.
      const docId = TokenService.tokenDocumentId(user.uid, token);
      await db.collection("userTokens").doc(docId).set(tokenData);

      // Store token in localStorage for client-side validation
      localStorage.setItem("userToken", token);
      localStorage.setItem("tokenUserId", user.uid);

      return token;
    } catch (error) {
      console.error("Error creating user token:", error);
      throw error;
    }
  }

  static async validateToken(user: firebase.User): Promise<boolean> {
    try {
      const storedToken = localStorage.getItem("userToken");
      const storedUserId = localStorage.getItem("tokenUserId");

      if (!storedToken || !storedUserId) {
        return false;
      }
      if (storedUserId !== user.uid) {
        // Stale browser session (e.g. another account on same device); clear so next login can mint a fresh token
        this.clearLocalToken();
        return false;
      }

      const docId = TokenService.tokenDocumentId(user.uid, storedToken);
      const primaryRef = db.collection("userTokens").doc(docId);
      const primarySnap = await primaryRef.get();

      let tokenRef: firebase.firestore.DocumentReference;
      let tokenData: firebase.firestore.DocumentData;

      if (primarySnap.exists) {
        tokenRef = primaryRef;
        tokenData = primarySnap.data()!;
      } else {
        const legacy = await db
          .collection("userTokens")
          .where("userId", "==", user.uid)
          .get();
        const found = legacy.docs.find((d) => d.data().token === storedToken);
        if (!found) {
          this.clearLocalToken();
          return false;
        }
        tokenRef = found.ref;
        tokenData = found.data();
      }
      if (!tokenData.isActive) {
        this.clearLocalToken();
        return false;
      }

      await tokenRef.update({
        lastActiveAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  static async revokeUserTokenByEmail(userEmail: string): Promise<void> {
    try {
      // Search tokens directly by email field
      const tokensByEmailQuery = await db
        .collection("userTokens")
        .where("userEmail", "==", userEmail)
        .get();

      if (!tokensByEmailQuery.empty) {
        const batch = db.batch();
        tokensByEmailQuery.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }
    } catch (error) {
      throw error;
    }
  }

  static async revokeUserToken(userId: string): Promise<void> {
    // Keep old method for backward compatibility
    return this.revokeUserTokenByEmail(userId);
  }

  static async revokeCurrentToken(user: firebase.User): Promise<void> {
    try {
      const storedToken = localStorage.getItem("userToken");

      if (storedToken) {
        const docId = TokenService.tokenDocumentId(user.uid, storedToken);
        const ref = db.collection("userTokens").doc(docId);
        const s = await ref.get();
        if (s.exists) {
          await ref.delete();
        } else {
          const legacy = await db
            .collection("userTokens")
            .where("userId", "==", user.uid)
            .get();
          const found = legacy.docs.find((d) => d.data().token === storedToken);
          if (found) await found.ref.delete();
        }
      }

      this.clearLocalToken();
    } catch (error) {
      throw error;
    }
  }

  static async revokeTokenById(tokenId: string): Promise<void> {
    await db.collection("userTokens").doc(tokenId).delete();
  }

  static async revokeAllUserTokens(userId: string): Promise<number> {
    const query = await db
      .collection("userTokens")
      .where("userId", "==", userId)
      .get();
    if (query.empty) return 0;
    const batch = db.batch();
    query.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return query.size;
  }

  static async revokeAllUserTokensExceptCurrent(user: firebase.User): Promise<number> {
    const currentToken = localStorage.getItem("userToken");
    if (!currentToken) return 0;
    const query = await db
      .collection("userTokens")
      .where("userId", "==", user.uid)
      .get();
    if (query.empty) return 0;

    const docsToDelete = query.docs.filter((doc) => doc.data().token !== currentToken);
    if (docsToDelete.length === 0) return 0;

    const batch = db.batch();
    docsToDelete.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return docsToDelete.length;
  }

  static clearLocalToken(): void {
    localStorage.removeItem("userToken");
    localStorage.removeItem("tokenUserId");
  }

  static async cleanupExpiredTokens(): Promise<void> {
    try {
      // Clean up tokens older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const expiredTokensQuery = await db
        .collection("userTokens")
        .where("lastActiveAt", "<", Timestamp.fromDate(thirtyDaysAgo))
        .get();

      const batch = db.batch();
      expiredTokensQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (!expiredTokensQuery.empty) {
        await batch.commit();
      }
    } catch (error) {
      // Silent cleanup
    }
  }

  static async getUserActiveSessions(userId: string): Promise<UserToken[]> {
    try {
      // Fetch by user only, then filter/sort in app to avoid strict index/schema coupling.
      const sessionsQuery = await db
        .collection("userTokens")
        .where("userId", "==", userId)
        .get();

      const rows = sessionsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserToken[];
      return rows
        .filter((row) => row.isActive !== false)
        .sort((a, b) => {
          const aMs = a.lastActiveAt?.toDate?.()?.getTime?.() || 0;
          const bMs = b.lastActiveAt?.toDate?.()?.getTime?.() || 0;
          return bMs - aMs;
        });
    } catch (error) {
      return [];
    }
  }
}

export { TokenService };
export type { UserToken };
