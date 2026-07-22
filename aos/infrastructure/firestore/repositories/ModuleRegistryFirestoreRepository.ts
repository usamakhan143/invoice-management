import type firebase from "firebase/compat/app";
import type { ModuleRegistryRepository } from "../../../contracts/ModuleRegistryRepository";
import type { ModuleRegistryEntry } from "../../../domain/catalog/entities/moduleRegistry";
import type { CompanyReadScope } from "../../../contracts/readScope";
import { getModuleRegistrySeedCatalog } from "../../../domain/catalog/seeds/moduleRegistrySeed";
import { AOS_COLLECTIONS } from "../collections";
import { runAosFirestoreOperation } from "../errors";

function catalogDocId(companyId: string, moduleId: string): string {
  return `${companyId}__${moduleId}`;
}

export class ModuleRegistryFirestoreRepository implements ModuleRegistryRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.MODULE_REGISTRY);
  }

  async ensureSeeded(scope: CompanyReadScope): Promise<void> {
    await runAosFirestoreOperation("ModuleRegistry.ensureSeeded", async () => {
      const existing = await this.collection()
        .where("companyId", "==", scope.companyId)
        .limit(1)
        .get();
      if (!existing.empty) {
        return;
      }
      const batch = this.firestore.batch();
      for (const module of getModuleRegistrySeedCatalog()) {
        const ref = this.collection().doc(catalogDocId(scope.companyId, module.moduleId));
        batch.set(ref, { companyId: scope.companyId, ...module });
      }
      await batch.commit();
    });
  }

  async listAll(scope: CompanyReadScope): Promise<readonly ModuleRegistryEntry[]> {
    await this.ensureSeeded(scope);
    return runAosFirestoreOperation("ModuleRegistry.listAll", async () => {
      const snap = await this.collection().where("companyId", "==", scope.companyId).get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        const { companyId: _companyId, ...module } = data;
        return module as ModuleRegistryEntry;
      });
    });
  }

  async findById(scope: CompanyReadScope, moduleId: string): Promise<ModuleRegistryEntry | null> {
    await this.ensureSeeded(scope);
    return runAosFirestoreOperation("ModuleRegistry.findById", async () => {
      const snap = await this.collection().doc(catalogDocId(scope.companyId, moduleId)).get();
      if (!snap.exists) {
        return null;
      }
      const data = snap.data()!;
      const { companyId: _companyId, ...module } = data;
      return module as ModuleRegistryEntry;
    });
  }

  async publishFromPromotion(
    command: import("../../../contracts/ModuleRegistryRepository").PublishModuleFromPromotionCommand,
  ): Promise<ModuleRegistryEntry> {
    return runAosFirestoreOperation("ModuleRegistry.publishFromPromotion", async () => {
      return this.firestore.runTransaction(async (tx) => {
        const newRef = this.collection().doc(
          catalogDocId(command.companyId, command.module.moduleId),
        );
        const newSnap = await tx.get(newRef);
        if (newSnap.exists) {
          const data = newSnap.data()!;
          const { companyId: _companyId, ...module } = data;
          return module as ModuleRegistryEntry;
        }

        if (command.markStaleModuleId) {
          const staleRef = this.collection().doc(
            catalogDocId(command.companyId, command.markStaleModuleId),
          );
          const staleSnap = await tx.get(staleRef);
          if (staleSnap.exists) {
            const staleData = staleSnap.data() as ModuleRegistryEntry & { companyId: string };
            tx.set(
              staleRef,
              {
                ...staleData,
                status: "deprecated",
              },
              { merge: true },
            );
          }
        }

        tx.set(newRef, { companyId: command.companyId, ...command.module });
        return command.module;
      });
    });
  }
}
