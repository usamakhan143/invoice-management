import type firebase from "firebase/compat/app";
import type { CompanyId } from "../../../types";

/** Returns document data when docId belongs to companyId; otherwise null (not found). */
export function companyScopedDocumentData(
  data: firebase.firestore.DocumentData | undefined,
  companyId: CompanyId,
): firebase.firestore.DocumentData | null {
  if (!data) return null;
  if (String(data.companyId ?? "") !== companyId) return null;
  return data;
}

/** Owner uid equals company root id in ERP tenancy model. */
export function isCompanyOwnerUser(companyId: CompanyId, userId: string): boolean {
  return userId === companyId;
}
