import type firebase from "firebase/compat/app";
import type { PlaybookRepository } from "../../../contracts/PlaybookRepository";
import type { CompanyReadScope } from "../../../contracts/readScope";
import type { PlaybookEntry } from "../../../domain/catalog/entities/playbookEntry";
import { getPlaybookSeedCatalog } from "../../../domain/catalog/seeds/playbookEntrySeed";
import { AOS_COLLECTIONS } from "../collections";
import { runAosFirestoreOperation } from "../errors";

function catalogDocId(companyId: string, entryId: string): string {
  return `${companyId}__${entryId}`;
}

export class PlaybookFirestoreRepository implements PlaybookRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.PLAYBOOK_ENTRIES);
  }

  async ensureSeeded(scope: CompanyReadScope): Promise<void> {
    await runAosFirestoreOperation("Playbook.ensureSeeded", async () => {
      const existing = await this.collection()
        .where("companyId", "==", scope.companyId)
        .limit(1)
        .get();
      if (!existing.empty) {
        return;
      }
      const batch = this.firestore.batch();
      for (const entry of getPlaybookSeedCatalog()) {
        const ref = this.collection().doc(catalogDocId(scope.companyId, entry.entryId));
        batch.set(ref, { companyId: scope.companyId, ...entry });
      }
      await batch.commit();
    });
  }

  async listAll(scope: CompanyReadScope): Promise<readonly PlaybookEntry[]> {
    await this.ensureSeeded(scope);
    return runAosFirestoreOperation("Playbook.listAll", async () => {
      const snap = await this.collection().where("companyId", "==", scope.companyId).get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        const { companyId: _companyId, ...entry } = data;
        return entry as PlaybookEntry;
      });
    });
  }

  async findById(scope: CompanyReadScope, entryId: string): Promise<PlaybookEntry | null> {
    await this.ensureSeeded(scope);
    return runAosFirestoreOperation("Playbook.findById", async () => {
      const snap = await this.collection().doc(catalogDocId(scope.companyId, entryId)).get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data()!;
      const { companyId: _companyId, ...entry } = data;
      return entry as PlaybookEntry;
    });
  }

  async publishFromPromotion(
    command: import("../../../contracts/PlaybookRepository").PublishPlaybookFromPromotionCommand,
  ): Promise<PlaybookEntry> {
    return runAosFirestoreOperation("Playbook.publishFromPromotion", async () => {
      return this.firestore.runTransaction(async (tx) => {
        const newRef = this.collection().doc(
          catalogDocId(command.companyId, command.entry.entryId),
        );
        const newSnap = await tx.get(newRef);
        if (newSnap.exists) {
          const data = newSnap.data()!;
          const { companyId: _companyId, ...entry } = data;
          return entry as PlaybookEntry;
        }

        if (command.markStaleEntryId) {
          const staleRef = this.collection().doc(
            catalogDocId(command.companyId, command.markStaleEntryId),
          );
          const staleSnap = await tx.get(staleRef);
          if (staleSnap.exists) {
            const staleData = staleSnap.data() as PlaybookEntry & { companyId: string };
            tx.set(
              staleRef,
              {
                ...staleData,
                tags: [...(staleData.tags ?? []), "superseded"],
              },
              { merge: true },
            );
          }
        }

        tx.set(newRef, { companyId: command.companyId, ...command.entry });
        return command.entry;
      });
    });
  }
}
