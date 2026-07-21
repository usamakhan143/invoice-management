import type { ModuleRegistryEntry } from "../domain/catalog/entities/moduleRegistry";
import type { CompanyReadScope } from "./readScope";

export interface ModuleRegistryRepository {
  ensureSeeded(scope: CompanyReadScope): Promise<void>;
  listAll(scope: CompanyReadScope): Promise<readonly ModuleRegistryEntry[]>;
  findById(scope: CompanyReadScope, moduleId: string): Promise<ModuleRegistryEntry | null>;
}
