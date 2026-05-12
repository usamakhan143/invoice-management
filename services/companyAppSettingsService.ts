import { db, Timestamp } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type firebase from "firebase/compat/app";
import type { MyCallActivityWorkdaySettings } from "../utils/myCallActivityBusinessDay";
import {
  DEFAULT_MY_CALL_ACTIVITY_WORKDAY_SETTINGS,
  mergeMyCallActivityWorkdaySettings,
} from "../utils/myCallActivityBusinessDay";

export type CompanyAppSettingsDoc = {
  companyId: string;
  myCallActivityWorkday?: Partial<MyCallActivityWorkdaySettings>;
  updatedAt?: firebase.firestore.Timestamp | null;
};

/**
 * Company-scoped prefs used only by specific features (not global billing/calendar).
 * Document id = companyId.
 */
export class CompanyAppSettingsService {
  private static ref(companyId: string) {
    return db.collection("companyAppSettings").doc(companyId.trim());
  }

  static async getMyCallActivityWorkday(companyId: string): Promise<MyCallActivityWorkdaySettings> {
    const cid = companyId.trim();
    if (!cid) return mergeMyCallActivityWorkdaySettings(null);
    const snap = await this.ref(cid).get();
    const raw = (snap.data() as CompanyAppSettingsDoc | undefined)?.myCallActivityWorkday;
    return mergeMyCallActivityWorkdaySettings(raw);
  }

  static async saveMyCallActivityWorkday(
    companyId: string,
    workday: MyCallActivityWorkdaySettings,
  ): Promise<void> {
    const cid = companyId.trim();
    if (!cid) throw new Error("Missing company id");
    const merged = mergeMyCallActivityWorkdaySettings(workday);
    const ok = await FirebaseHealth.safeSetDocument("companyAppSettings", cid, {
      companyId: cid,
      myCallActivityWorkday: merged,
      updatedAt: Timestamp.now(),
    });
    if (!ok) throw new Error("Failed to save company app settings");
  }
}
