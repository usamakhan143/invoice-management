import { auth, db } from "./firebase";
import type firebase from "firebase/compat/app";
import { TokenService } from "./tokenService";

class UserMonitoringService {
  private static unsubscribeCompanyUser: (() => void) | null = null;
  private static unsubscribeUserDoc: (() => void) | null = null;
  private static unsubscribeTokens: (() => void) | null = null;

  static startMonitoring(user: firebase.User) {
    this.cleanup(); // Clean up any existing listeners

    // Only start monitoring if we have a valid user
    if (!user || !user.uid) {
      console.warn("Cannot start monitoring: invalid user");
      return;
    }

    try {
      // Monitor user document for deactivation with safer error handling
      this.unsubscribeUserDoc = db
        .collection("users")
        .doc(user.uid)
        .onSnapshot(
          (doc) => {
            if (doc.exists) {
              const userData = doc.data();
              if (userData?.isDeactivated === true || userData?.isActive === false) {
                this.forceLogout();
              }
            }
          },
          (error) => {
            console.warn("User document monitoring disabled due to permissions:", error.message);
            // Don't retry if it's a permission error
          }
        );
    } catch (error) {
      console.warn("Failed to setup user document monitoring:", error);
    }

    void this.monitorUserTokens(user);

    // Monitor company user document for deactivation - with better error handling
    try {
      this.unsubscribeCompanyUser = db
        .collection("companyUsers")
        .where("uid", "==", user.uid)
        .onSnapshot(
          (snapshot) => {
            if (!snapshot.empty) {
              const companyUserDoc = snapshot.docs[0];
              const companyUserData = companyUserDoc.data();

              if (companyUserData.isActive === false) {
                this.forceLogout();
              }
            }
          },
          (error) => {
            console.warn("Company user monitoring disabled due to permissions:", error.message);
            // Don't retry if it's a permission error
          }
        );
    } catch (error) {
      console.warn("Failed to setup company user monitoring:", error);
    }
  }

  static async monitorUserTokens(user: firebase.User) {
    const currentToken = localStorage.getItem("userToken");
    if (!currentToken || currentToken.startsWith("impersonation_")) return;

    try {
      const docRef = db
        .collection("userTokens")
        .doc(TokenService.tokenDocumentId(user.uid, currentToken));
      const initial = await docRef.get({ source: "default" });

      const onTokenInactive = (data: { isActive?: boolean } | undefined) => {
        if (!data || data.isActive === false) this.forceLogout();
      };

      if (initial.exists) {
        this.unsubscribeTokens = docRef.onSnapshot(
          (snap) => {
            if (!snap.exists) {
              this.forceLogout();
              return;
            }
            onTokenInactive(snap.data());
          },
          (error) => {
            console.warn("Token monitoring disabled due to permissions:", error.message);
          },
        );
        return;
      }

      // Legacy auto-id session rows
      this.unsubscribeTokens = db
        .collection("userTokens")
        .where("userId", "==", user.uid)
        .onSnapshot(
          (snapshot) => {
            const tokenDoc = snapshot.docs.find((d) => d.data().token === currentToken);
            if (!tokenDoc) {
              this.forceLogout();
              return;
            }
            onTokenInactive(tokenDoc.data());
          },
          (error) => {
            console.warn("Token monitoring disabled due to permissions:", error.message);
          },
        );
    } catch (error) {
      console.warn("Failed to setup token monitoring:", error);
    }
  }

  static forceLogout() {
    try {
      // Force sign out
      auth.signOut();

      // Clear any cached data
      sessionStorage.clear();
      localStorage.clear();

      // Redirect to login page
      if (window.location.hash !== "#/login") {
        window.location.hash = "#/login";
        window.location.reload();
      }
    } catch (error) {
      console.error("Error during force logout:", error);
      // Force page reload as fallback
      window.location.reload();
    }
  }

  static cleanup() {
    if (this.unsubscribeUserDoc) {
      this.unsubscribeUserDoc();
      this.unsubscribeUserDoc = null;
    }
    if (this.unsubscribeCompanyUser) {
      this.unsubscribeCompanyUser();
      this.unsubscribeCompanyUser = null;
    }
    if (this.unsubscribeTokens) {
      this.unsubscribeTokens();
      this.unsubscribeTokens = null;
    }
  }
}

export { UserMonitoringService };
