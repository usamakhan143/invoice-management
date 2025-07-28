import { auth, db } from "./firebase";
import type firebase from "firebase/compat/app";

class UserMonitoringService {
  private static unsubscribeCompanyUser: (() => void) | null = null;
  private static unsubscribeUserDoc: (() => void) | null = null;
  private static unsubscribeTokens: (() => void) | null = null;

  static startMonitoring(user: firebase.User) {
    this.cleanup(); // Clean up any existing listeners

    // Monitor user document for deactivation
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
          console.error("Error monitoring user document:", error);
        }
      );

    // Monitor user tokens for revocation
    this.monitorUserTokens(user);

    // Monitor company user document for deactivation
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
          console.error("Error monitoring company user:", error);
        }
      );
  }

  static monitorUserTokens(user: firebase.User) {
    // Monitor user tokens for deletion
    const currentToken = localStorage.getItem("userToken");
    if (currentToken) {
      this.unsubscribeTokens = db
        .collection("userTokens")
        .where("userId", "==", user.uid)
        .where("token", "==", currentToken)
        .onSnapshot(
          (snapshot) => {
            if (snapshot.empty) {
              this.forceLogout();
              return;
            }

            const tokenDoc = snapshot.docs[0];
            const tokenData = tokenDoc.data();

            if (!tokenData.isActive) {
              this.forceLogout();
            }
          },
          (error) => {
            console.error("Error monitoring user tokens:", error);
          }
        );
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
