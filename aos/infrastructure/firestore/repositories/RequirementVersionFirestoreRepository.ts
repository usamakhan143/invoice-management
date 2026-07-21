import type firebase from "firebase/compat/app";
import type {
  PublishRequirementVersionCommand,
  RequirementVersionRepository,
} from "../../../contracts/RequirementVersionRepository";
import type { RequirementVersion } from "../../../domain/requirements/entities/requirementVersion";
import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import {
  requirementVersionFromFirestore,
  requirementVersionToFirestore,
} from "../models/requirementVersionDocument";

export class RequirementVersionFirestoreRepository implements RequirementVersionRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS);
  }

  async publish(command: PublishRequirementVersionCommand): Promise<RequirementVersion> {
    return runAosFirestoreOperation("RequirementVersion.publish", async () => {
      const { version } = command;
      assertCompanyMatch(command.companyId, version.companyId, "RequirementVersion");
      const ref = this.collection().doc(version.id);
      const existing = await ref.get();
      if (existing.exists) {
        throw new AosRepositoryError(
          `RequirementVersion ${version.id} already exists`,
          "VERSION_CONFLICT",
        );
      }
      await ref.set(requirementVersionToFirestore(version));
      const saved = requirementVersionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("RequirementVersion publish failed");
      return saved;
    });
  }

  async getById(companyId: CompanyId, versionId: string): Promise<RequirementVersion | null> {
    return runAosFirestoreOperation("RequirementVersion.getById", async () => {
      const snap = await this.collection().doc(versionId).get();
      if (!snap.exists) return null;
      const version = requirementVersionFromFirestore(snap.id, snap.data());
      if (!version) return null;
      assertCompanyMatch(companyId, version.companyId, "RequirementVersion");
      return version;
    });
  }

  async listBySet(
    companyId: CompanyId,
    requirementSetId: string,
  ): Promise<readonly RequirementVersion[]> {
    return runAosFirestoreOperation("RequirementVersion.listBySet", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("requirementSetId", "==", requirementSetId)
        .get();
      return snap.docs
        .map((doc) => requirementVersionFromFirestore(doc.id, doc.data()))
        .filter((v): v is RequirementVersion => v !== null)
        .sort((a, b) => a.versionNumber - b.versionNumber);
    });
  }

  async listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly RequirementVersion[]> {
    return runAosFirestoreOperation("RequirementVersion.listByEngagement", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("engagementId", "==", engagementId)
        .get();
      return snap.docs
        .map((doc) => requirementVersionFromFirestore(doc.id, doc.data()))
        .filter((v): v is RequirementVersion => v !== null)
        .sort((a, b) => a.versionNumber - b.versionNumber);
    });
  }

  async getLatestApproved(
    companyId: CompanyId,
    requirementSetId: string,
  ): Promise<RequirementVersion | null> {
    const versions = await this.listBySet(companyId, requirementSetId);
    return versions.length > 0 ? versions[versions.length - 1]! : null;
  }
}
