import type firebase from "firebase/compat/app";
import type {
  LearningCandidateRepository,
  SaveLearningCandidateCommand,
  UpdateLearningCandidateStatusCommand,
  UpsertLearningCandidateCommand,
} from "../../../contracts/learning/LearningRepositories";
import type { LearningCandidate, LearningCandidateStatus } from "../../../domain/learning/entities/learningCandidate";
import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS, DEFAULT_PAGE_SIZE } from "../collections";
import {
  learningCandidateFromFirestore,
  learningCandidateToFirestore,
} from "../models/learningDocument";
import { AosRepositoryError, assertCompanyMatch, runAosFirestoreOperation } from "../errors";

export class LearningCandidateFirestoreRepository implements LearningCandidateRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.LEARNING_CANDIDATES);
  }

  async getById(companyId: CompanyId, candidateId: string): Promise<LearningCandidate | null> {
    return runAosFirestoreOperation("LearningCandidate.getById", async () => {
      const snap = await this.collection().doc(candidateId).get();
      if (!snap.exists) return null;
      const candidate = learningCandidateFromFirestore(snap.id, snap.data());
      if (!candidate) return null;
      assertCompanyMatch(companyId, candidate.companyId, "LearningCandidate");
      return candidate;
    });
  }

  async listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly LearningCandidate[]> {
    return runAosFirestoreOperation("LearningCandidate.listByEngagement", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("engagementId", "==", engagementId)
        .limit(DEFAULT_PAGE_SIZE)
        .get();
      return this.mapDocs(companyId, snap.docs);
    });
  }

  async listByStatus(
    companyId: CompanyId,
    status: LearningCandidateStatus,
  ): Promise<readonly LearningCandidate[]> {
    return runAosFirestoreOperation("LearningCandidate.listByStatus", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("status", "==", status)
        .limit(DEFAULT_PAGE_SIZE)
        .get();
      return this.mapDocs(companyId, snap.docs);
    });
  }

  async listByExtractionRun(
    companyId: CompanyId,
    extractionRunId: string,
  ): Promise<readonly LearningCandidate[]> {
    return runAosFirestoreOperation("LearningCandidate.listByExtractionRun", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("extractionRunId", "==", extractionRunId)
        .limit(DEFAULT_PAGE_SIZE)
        .get();
      return this.mapDocs(companyId, snap.docs);
    });
  }

  async upsert(command: UpsertLearningCandidateCommand): Promise<LearningCandidate> {
    return runAosFirestoreOperation("LearningCandidate.upsert", async () => {
      assertCompanyMatch(command.companyId, command.candidate.companyId, "LearningCandidate");
      const ref = this.collection().doc(command.candidate.candidateId);
      const existing = await ref.get();
      if (existing.exists) {
        const loaded = learningCandidateFromFirestore(existing.id, existing.data());
        if (!loaded) throw new Error("LearningCandidate corrupt");
        assertCompanyMatch(command.companyId, loaded.companyId, "LearningCandidate");
        if (loaded.sourceFingerprint === command.candidate.sourceFingerprint) {
          return loaded;
        }
        throw new AosRepositoryError(
          `Candidate ${command.candidate.candidateId} already exists with different fingerprint`,
          "AOS_SAVE_FAILED",
        );
      }
      await ref.set(learningCandidateToFirestore(command.candidate));
      const saved = learningCandidateFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("LearningCandidate upsert failed");
      return saved;
    });
  }

  async updateStatus(command: UpdateLearningCandidateStatusCommand): Promise<LearningCandidate> {
    return runAosFirestoreOperation("LearningCandidate.updateStatus", async () => {
      const ref = this.collection().doc(command.candidateId);
      const existing = await ref.get();
      if (!existing.exists) {
        throw new AosRepositoryError(`Candidate ${command.candidateId} not found`, "AOS_NOT_FOUND");
      }
      const loaded = learningCandidateFromFirestore(existing.id, existing.data());
      if (!loaded) throw new Error("LearningCandidate corrupt");
      assertCompanyMatch(command.companyId, loaded.companyId, "LearningCandidate");
      if (loaded.version !== command.expectedVersion) {
        throw new AosRepositoryError(
          `Candidate version conflict: expected ${command.expectedVersion}, got ${loaded.version}`,
          "VERSION_CONFLICT",
        );
      }
      const updated: LearningCandidate = {
        ...loaded,
        status: command.status,
        version: loaded.version + 1,
        updatedAt: command.updatedAt,
      };
      await ref.set(learningCandidateToFirestore(updated), { merge: true });
      const saved = learningCandidateFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("LearningCandidate updateStatus failed");
      return saved;
    });
  }

  async saveCandidate(command: SaveLearningCandidateCommand): Promise<LearningCandidate> {
    return runAosFirestoreOperation("LearningCandidate.saveCandidate", async () => {
      assertCompanyMatch(command.companyId, command.candidate.companyId, "LearningCandidate");
      const ref = this.collection().doc(command.candidate.candidateId);
      const existing = await ref.get();
      if (!existing.exists) {
        throw new AosRepositoryError(
          `Candidate ${command.candidate.candidateId} not found`,
          "AOS_NOT_FOUND",
        );
      }
      const loaded = learningCandidateFromFirestore(existing.id, existing.data());
      if (!loaded) throw new Error("LearningCandidate corrupt");
      assertCompanyMatch(command.companyId, loaded.companyId, "LearningCandidate");
      if (loaded.version !== command.expectedVersion) {
        throw new AosRepositoryError(
          `Candidate version conflict: expected ${command.expectedVersion}, got ${loaded.version}`,
          "VERSION_CONFLICT",
        );
      }
      if (loaded.sourceFingerprint !== command.candidate.sourceFingerprint) {
        throw new AosRepositoryError(
          "Candidate sourceFingerprint is immutable",
          "AOS_UPDATE_FAILED",
        );
      }
      await ref.set(learningCandidateToFirestore(command.candidate));
      const saved = learningCandidateFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("LearningCandidate saveCandidate failed");
      return saved;
    });
  }

  private mapDocs(
    companyId: CompanyId,
    docs: firebase.firestore.QueryDocumentSnapshot[],
  ): LearningCandidate[] {
    const results: LearningCandidate[] = [];
    for (const doc of docs) {
      const candidate = learningCandidateFromFirestore(doc.id, doc.data());
      if (!candidate) continue;
      assertCompanyMatch(companyId, candidate.companyId, "LearningCandidate");
      results.push(candidate);
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
