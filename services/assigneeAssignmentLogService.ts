import { db, Timestamp } from "./firebase";
import type { AssigneeAssignmentLog } from "../types";
import { formatLocalDayKey } from "../utils/localDayKey";
import type firebase from "firebase/compat/app";

function docToLog(
  doc: firebase.firestore.QueryDocumentSnapshot | firebase.firestore.DocumentSnapshot,
): AssigneeAssignmentLog {
  return { id: doc.id, ...doc.data() } as AssigneeAssignmentLog;
}

export class AssigneeAssignmentLogService {
  /**
   * Append one audit row when a lead is (re)assigned. Uses local calendar day for `dayKey`
   * so dashboard date filters match `<input type="date">`.
   */
  static async record(params: {
    companyId: string;
    assigneeUserId: string;
    leadId: string;
    assignedByUserId: string;
  }): Promise<void> {
    const companyId = params.companyId.trim();
    const assigneeUserId = params.assigneeUserId.trim();
    if (!companyId || !assigneeUserId || !params.leadId.trim()) return;

    const now = Timestamp.now();
    const dayKey = formatLocalDayKey(now.toDate());

    await db.collection("assigneeAssignmentLog").add({
      companyId,
      assigneeUserId,
      leadId: params.leadId.trim(),
      assignedByUserId: params.assignedByUserId,
      dayKey,
      createdAt: now,
    });
  }

  static async fetchForCompany(
    companyId: string,
    dayKeyFrom: string,
    dayKeyTo: string,
  ): Promise<AssigneeAssignmentLog[]> {
    const snap = await db
      .collection("assigneeAssignmentLog")
      .where("companyId", "==", companyId)
      .where("dayKey", ">=", dayKeyFrom)
      .where("dayKey", "<=", dayKeyTo)
      .get();
    return snap.docs.map(docToLog);
  }

  static async fetchForAssignee(
    companyId: string,
    assigneeUserId: string,
    dayKeyFrom: string,
    dayKeyTo: string,
  ): Promise<AssigneeAssignmentLog[]> {
    const snap = await db
      .collection("assigneeAssignmentLog")
      .where("companyId", "==", companyId)
      .where("assigneeUserId", "==", assigneeUserId)
      .where("dayKey", ">=", dayKeyFrom)
      .where("dayKey", "<=", dayKeyTo)
      .get();
    return snap.docs.map(docToLog);
  }
}
