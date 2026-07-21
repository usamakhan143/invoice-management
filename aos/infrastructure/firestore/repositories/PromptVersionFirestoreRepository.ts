import type firebase from "firebase/compat/app";
import type {
  PromptVersionRepository,
  PublishPromptVersionCommand,
} from "../../../contracts/PromptVersionRepository";
import type { PromptVersion } from "../../../domain/prompt/entities/promptVersion";
import type { CompanyId } from "../../../types";
import { AOS_COLLECTIONS } from "../collections";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import {
  promptVersionFromFirestore,
  promptVersionToFirestore,
} from "../models/promptVersionDocument";

export class PromptVersionFirestoreRepository implements PromptVersionRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.PROMPT_VERSIONS);
  }

  async publish(command: PublishPromptVersionCommand): Promise<PromptVersion> {
    return runAosFirestoreOperation("PromptVersion.publish", async () => {
      const { version } = command;
      assertCompanyMatch(command.companyId, version.companyId, "PromptVersion");
      const ref = this.collection().doc(version.id);
      if ((await ref.get()).exists) {
        throw new AosRepositoryError(`PromptVersion ${version.id} already exists`, "VERSION_CONFLICT");
      }
      await ref.set(promptVersionToFirestore(version));
      const saved = promptVersionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("PromptVersion publish failed");
      return saved;
    });
  }

  async getById(companyId: CompanyId, versionId: string): Promise<PromptVersion | null> {
    return runAosFirestoreOperation("PromptVersion.getById", async () => {
      const snap = await this.collection().doc(versionId).get();
      if (!snap.exists) return null;
      const version = promptVersionFromFirestore(snap.id, snap.data());
      if (!version) return null;
      assertCompanyMatch(companyId, version.companyId, "PromptVersion");
      return version;
    });
  }

  async listByArtifact(
    companyId: CompanyId,
    promptArtifactId: string,
  ): Promise<readonly PromptVersion[]> {
    return runAosFirestoreOperation("PromptVersion.listByArtifact", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("promptArtifactId", "==", promptArtifactId)
        .get();
      return snap.docs
        .map((doc) => promptVersionFromFirestore(doc.id, doc.data()))
        .filter((v): v is PromptVersion => v !== null)
        .sort((a, b) => a.versionNumber - b.versionNumber);
    });
  }

  async getLatestApproved(
    companyId: CompanyId,
    promptArtifactId: string,
  ): Promise<PromptVersion | null> {
    const versions = await this.listByArtifact(companyId, promptArtifactId);
    return versions.length > 0 ? versions[versions.length - 1]! : null;
  }

  async listByRequirementVersionId(
    companyId: CompanyId,
    requirementVersionId: string,
  ): Promise<readonly PromptVersion[]> {
    return runAosFirestoreOperation("PromptVersion.listByRequirementVersionId", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("requirementVersionId", "==", requirementVersionId)
        .get();
      return snap.docs
        .map((doc) => promptVersionFromFirestore(doc.id, doc.data()))
        .filter((v): v is PromptVersion => v !== null)
        .sort((a, b) => a.versionNumber - b.versionNumber);
    });
  }
}
