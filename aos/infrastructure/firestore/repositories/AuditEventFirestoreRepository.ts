import type firebase from "firebase/compat/app";
import type { AuditEventRepository } from "../../../contracts/EngagementWorkflowRepository";
import type { AuditEvent } from "../../../domain/audit/entities/auditEvent";
import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import {
  auditEventFromFirestore,
  auditEventToFirestore,
} from "../models/engagementWorkflowDocument";
import { assertCompanyMatch, runAosFirestoreOperation } from "../errors";

/** Append-only audit store — ADR-014. Updates and deletes are not exposed. */
export class AuditEventFirestoreRepository implements AuditEventRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.AUDIT_EVENTS);
  }

  async append(event: AuditEvent): Promise<AuditEvent> {
    return runAosFirestoreOperation("AuditEvent.append", async () => {
      const ref = this.collection().doc(event.id);
      const existing = await ref.get();
      if (existing.exists) {
        throw new Error(`Audit event ${event.id} already exists — append-only violation`);
      }
      await ref.set(auditEventToFirestore(event));
      const saved = auditEventFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) {
        throw new Error("AuditEvent append failed");
      }
      return saved;
    });
  }

  async listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
    limit = 100,
  ): Promise<AuditEvent[]> {
    return runAosFirestoreOperation("AuditEvent.listByEngagement", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("engagementId", "==", engagementId)
        .limit(limit)
        .get();

      const events = snap.docs
        .map((doc) => auditEventFromFirestore(doc.id, doc.data()))
        .filter((event): event is AuditEvent => event !== null);

      for (const event of events) {
        assertCompanyMatch(companyId, event.companyId, "AuditEvent");
      }

      return events.sort((a, b) => b.occurredAt - a.occurredAt);
    });
  }
}
