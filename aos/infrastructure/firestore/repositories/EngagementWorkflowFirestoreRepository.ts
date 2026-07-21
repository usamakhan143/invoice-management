import type firebase from "firebase/compat/app";
import type { EngagementWorkflowRepository } from "../../../contracts/EngagementWorkflowRepository";
import type { EngagementWorkflow } from "../../../domain/workflow/entities/engagementWorkflow";
import { createEmptyEngagementWorkflow } from "../../../domain/workflow/entities/engagementWorkflow";
import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { isVersionChainsEnabled } from "../../../config/versionChainConfig";
import { AOS_COLLECTIONS } from "../collections";
import {
  engagementWorkflowFromFirestore,
  engagementWorkflowToFirestore,
} from "../models/engagementWorkflowDocument";
import { assertCompanyMatch, runAosFirestoreOperation } from "../errors";
import { nowEpochMs } from "../timestamp";

export class EngagementWorkflowFirestoreRepository implements EngagementWorkflowRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS);
  }

  private docId(companyId: CompanyId, engagementId: DeliveryEngagementId): string {
    return `${companyId}__${engagementId}`;
  }

  async get(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflow | null> {
    return runAosFirestoreOperation("EngagementWorkflow.get", async () => {
      const snap = await this.collection().doc(this.docId(companyId, engagementId)).get();
      if (!snap.exists) {
        return null;
      }
      const workflow = engagementWorkflowFromFirestore(engagementId, snap.data());
      if (!workflow) {
        return null;
      }
      assertCompanyMatch(companyId, workflow.companyId, "EngagementWorkflow");
      return workflow;
    });
  }

  async getOrCreate(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflow> {
    const existing = await this.get(companyId, engagementId);
    if (existing) {
      return existing;
    }
    const created = createEmptyEngagementWorkflow(companyId, engagementId);
    return this.save(companyId, created);
  }

  async listByCompany(companyId: CompanyId): Promise<EngagementWorkflow[]> {
    return runAosFirestoreOperation("EngagementWorkflow.listByCompany", async () => {
      const snap = await this.collection().where("companyId", "==", companyId).get();
      const results: EngagementWorkflow[] = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        const engagementId =
          typeof data.engagementId === "string" && data.engagementId.length > 0
            ? data.engagementId
            : doc.id;
        const workflow = engagementWorkflowFromFirestore(engagementId, data);
        if (workflow) {
          assertCompanyMatch(companyId, workflow.companyId, "EngagementWorkflow");
          results.push(workflow);
        }
      }
      return results;
    });
  }

  async save(companyId: CompanyId, workflow: EngagementWorkflow): Promise<EngagementWorkflow> {
    return runAosFirestoreOperation("EngagementWorkflow.save", async () => {
      assertCompanyMatch(companyId, workflow.companyId, "EngagementWorkflow");
      const now = nowEpochMs();
      const payload = engagementWorkflowToFirestore(workflow, now, {
        persistVersionRegistry: !isVersionChainsEnabled(),
      });
      await this.collection().doc(this.docId(companyId, workflow.engagementId)).set(payload, {
        merge: true,
      });
      const saved = await this.get(companyId, workflow.engagementId);
      if (!saved) {
        throw new Error("EngagementWorkflow save failed");
      }
      return saved;
    });
  }
}
