import type firebase from "firebase/compat/app";
import type { InitiativeReadPort } from "../../../integration/ports/InitiativeReadPort";
import type { CompanyId } from "../../../types";
import { BOS_READ_COLLECTIONS } from "./collections";
import { companyScopedDocumentData } from "./companyScope";
import { runAosFirestoreOperation } from "../firestore/errors";

export class InitiativeReadAdapter implements InitiativeReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(BOS_READ_COLLECTIONS.INITIATIVES);
  }

  async initiativeExists(companyId: CompanyId, initiativeId: string): Promise<boolean> {
    const summary = await this.getInitiativeSummary(companyId, initiativeId);
    return summary !== null;
  }

  async getInitiativeSummary(
    companyId: CompanyId,
    initiativeId: string,
  ): Promise<{ name: string; status?: string; ventureId?: string } | null> {
    return runAosFirestoreOperation("InitiativeReadAdapter.getInitiativeSummary", async () => {
      const snap = await this.collection().doc(initiativeId).get();
      if (!snap.exists) return null;

      const data = companyScopedDocumentData(snap.data(), companyId);
      if (!data) return null;

      const name = String(data.name ?? "").trim();
      if (!name) return null;

      return {
        name,
        status: data.status ? String(data.status) : undefined,
        ventureId: data.ventureId ? String(data.ventureId) : undefined,
      };
    });
  }
}
