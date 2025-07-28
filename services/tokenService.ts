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

      // Store token in Firestore
      await db.collection("userTokens").add(tokenData);

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

      if (!storedToken || !storedUserId || storedUserId !== user.uid) {
        console.log("No valid token found in localStorage");
        return false;
      }

      // Check if token exists in Firestore (it should exist if not deleted)
      const tokenQuery = await db
        .collection("userTokens")
        .where("userId", "==", user.uid)
        .where("token", "==", storedToken)
        .get();

      if (tokenQuery.empty) {
        this.clearLocalToken();
        return false;
      }

      const tokenDoc = tokenQuery.docs[0];
      const tokenData = tokenDoc.data();

      if (!tokenData.isActive) {
        this.clearLocalToken();
        return false;
      }

      // Update last active time
      await tokenDoc.ref.update({
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
        // DELETE specific token
        const tokenQuery = await db
          .collection("userTokens")
          .where("userId", "==", user.uid)
          .where("token", "==", storedToken)
          .get();

        if (!tokenQuery.empty) {
          const tokenDoc = tokenQuery.docs[0];
          await tokenDoc.ref.delete(); // Actually delete the token
        }
      }

      this.clearLocalToken();
    } catch (error) {
      throw error;
    }
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
      const activeSessionsQuery = await db
        .collection("userTokens")
        .where("userId", "==", userId)
        .where("isActive", "==", true)
        .orderBy("lastActiveAt", "desc")
        .get();

      return activeSessionsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserToken[];
    } catch (error) {
      return [];
    }
  }
}

export { TokenService };
export type { UserToken };
