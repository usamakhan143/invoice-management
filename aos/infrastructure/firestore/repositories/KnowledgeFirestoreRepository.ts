import type firebase from "firebase/compat/app";
import type { KnowledgeRepository } from "../../../contracts/KnowledgeRepository";
import type { CompanyReadScope } from "../../../contracts/readScope";
import type { KnowledgePattern } from "../../../domain/catalog/entities/knowledgePattern";
import { getKnowledgeSeedCatalog } from "../../../domain/catalog/seeds/knowledgePatternSeed";
import { AOS_COLLECTIONS } from "../collections";
import { runAosFirestoreOperation } from "../errors";

function catalogDocId(companyId: string, patternId: string): string {
  return `${companyId}__${patternId}`;
}

export class KnowledgeFirestoreRepository implements KnowledgeRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.KNOWLEDGE_PATTERNS);
  }

  async ensureSeeded(scope: CompanyReadScope): Promise<void> {
    await runAosFirestoreOperation("Knowledge.ensureSeeded", async () => {
      const existing = await this.collection()
        .where("companyId", "==", scope.companyId)
        .limit(1)
        .get();
      if (!existing.empty) {
        return;
      }
      const batch = this.firestore.batch();
      for (const pattern of getKnowledgeSeedCatalog()) {
        const ref = this.collection().doc(catalogDocId(scope.companyId, pattern.patternId));
        batch.set(ref, { companyId: scope.companyId, ...pattern });
      }
      await batch.commit();
    });
  }

  async listAll(scope: CompanyReadScope): Promise<readonly KnowledgePattern[]> {
    await this.ensureSeeded(scope);
    return runAosFirestoreOperation("Knowledge.listAll", async () => {
      const snap = await this.collection().where("companyId", "==", scope.companyId).get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        const { companyId: _companyId, ...pattern } = data;
        return pattern as KnowledgePattern;
      });
    });
  }

  async findById(scope: CompanyReadScope, patternId: string): Promise<KnowledgePattern | null> {
    await this.ensureSeeded(scope);
    return runAosFirestoreOperation("Knowledge.findById", async () => {
      const snap = await this.collection().doc(catalogDocId(scope.companyId, patternId)).get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data()!;
      const { companyId: _companyId, ...pattern } = data;
      return pattern as KnowledgePattern;
    });
  }
}
