import type firebase from "firebase/compat/app";
import type { LearningPromotionRepository } from "../../../contracts/learning/LearningRepositories";
import type { LearningPromotionRecord } from "../../../domain/learning/entities/learningPromotionRecord";
import type { CompanyId } from "../../../types";
import { AOS_COLLECTIONS } from "../collections";
import {
  learningPromotionFromFirestore,
  learningPromotionToFirestore,
} from "../models/learningDocument";
import { assertCompanyMatch, runAosFirestoreOperation } from "../errors";

/** Append-only promotion history — writes belong to F3 orchestration. */
export class LearningPromotionFirestoreRepository implements LearningPromotionRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS);
  }

  async getByCandidateId(
    companyId: CompanyId,
    candidateId: string,
  ): Promise<LearningPromotionRecord | null> {
    return runAosFirestoreOperation("LearningPromotion.getByCandidateId", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("candidateId", "==", candidateId)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0]!;
      const record = learningPromotionFromFirestore(doc.id, doc.data());
      if (!record) return null;
      assertCompanyMatch(companyId, record.companyId, "LearningPromotion");
      return record;
    });
  }

  async append(record: LearningPromotionRecord): Promise<LearningPromotionRecord> {
    return runAosFirestoreOperation("LearningPromotion.append", async () => {
      const ref = this.collection().doc(record.promotionId);
      const existing = await ref.get();
      if (existing.exists) {
        const loaded = learningPromotionFromFirestore(existing.id, existing.data());
        if (loaded) return loaded;
      }
      await ref.set(learningPromotionToFirestore(record));
      const saved = learningPromotionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("LearningPromotion append failed");
      return saved;
    });
  }
}
