import type firebase from "firebase/compat/app";
import type {
  CreateLearningExtractionRunCommand,
  LearningExtractionRunRepository,
  UpdateLearningExtractionRunCommand,
} from "../../../contracts/learning/LearningRepositories";
import type { LearningExtractionRun } from "../../../domain/learning/entities/learningExtractionRun";
import type { CompanyId } from "../../../types";
import { AOS_COLLECTIONS } from "../collections";
import {
  learningExtractionRunFromFirestore,
  learningExtractionRunToFirestore,
} from "../models/learningDocument";
import { assertCompanyMatch, runAosFirestoreOperation } from "../errors";

export class LearningExtractionRunFirestoreRepository implements LearningExtractionRunRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.LEARNING_EXTRACTION_RUNS);
  }

  async getById(
    companyId: CompanyId,
    extractionRunId: string,
  ): Promise<LearningExtractionRun | null> {
    return runAosFirestoreOperation("LearningExtractionRun.getById", async () => {
      const snap = await this.collection().doc(extractionRunId).get();
      if (!snap.exists) return null;
      const run = learningExtractionRunFromFirestore(snap.id, snap.data());
      if (!run) return null;
      assertCompanyMatch(companyId, run.companyId, "LearningExtractionRun");
      return run;
    });
  }

  async getByRetrospective(
    companyId: CompanyId,
    retrospectiveId: string,
  ): Promise<LearningExtractionRun | null> {
    return runAosFirestoreOperation("LearningExtractionRun.getByRetrospective", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("retrospectiveId", "==", retrospectiveId)
        .limit(1)
        .get();
      if (snap.empty) return null;
      const doc = snap.docs[0]!;
      const run = learningExtractionRunFromFirestore(doc.id, doc.data());
      if (!run) return null;
      assertCompanyMatch(companyId, run.companyId, "LearningExtractionRun");
      return run;
    });
  }

  async create(command: CreateLearningExtractionRunCommand): Promise<LearningExtractionRun> {
    return runAosFirestoreOperation("LearningExtractionRun.create", async () => {
      assertCompanyMatch(command.companyId, command.run.companyId, "LearningExtractionRun");
      const ref = this.collection().doc(command.run.extractionRunId);
      const existing = await ref.get();
      if (existing.exists) {
        const loaded = learningExtractionRunFromFirestore(existing.id, existing.data());
        if (loaded) return loaded;
      }
      await ref.set(learningExtractionRunToFirestore(command.run));
      const saved = learningExtractionRunFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("LearningExtractionRun create failed");
      return saved;
    });
  }

  async update(command: UpdateLearningExtractionRunCommand): Promise<LearningExtractionRun> {
    return runAosFirestoreOperation("LearningExtractionRun.update", async () => {
      assertCompanyMatch(command.companyId, command.run.companyId, "LearningExtractionRun");
      const ref = this.collection().doc(command.extractionRunId);
      const existing = await ref.get();
      if (!existing.exists) {
        throw new Error(`LearningExtractionRun ${command.extractionRunId} not found`);
      }
      const prior = learningExtractionRunFromFirestore(existing.id, existing.data());
      if (!prior) throw new Error("LearningExtractionRun corrupt");
      assertCompanyMatch(command.companyId, prior.companyId, "LearningExtractionRun");

      // Immutable provenance after terminal complete
      if (prior.status === "completed" && command.run.status !== "completed") {
        return prior;
      }

      await ref.set(learningExtractionRunToFirestore(command.run), { merge: true });
      const saved = learningExtractionRunFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("LearningExtractionRun update failed");
      return saved;
    });
  }
}
