import type { CompanyId } from "../types";
import type { ModuleRegistryEntry } from "../domain/catalog/entities/moduleRegistry";

export interface PublishModuleFromPromotionCommand {
  companyId: CompanyId;
  module: ModuleRegistryEntry;
  markStaleModuleId?: string;
}

export interface ModuleRegistryRepository {
  ensureSeeded(scope: import("./readScope").CompanyReadScope): Promise<void>;
  listAll(scope: import("./readScope").CompanyReadScope): Promise<readonly ModuleRegistryEntry[]>;
  findById(
    scope: import("./readScope").CompanyReadScope,
    moduleId: string,
  ): Promise<ModuleRegistryEntry | null>;
  publishFromPromotion(
    command: PublishModuleFromPromotionCommand,
  ): Promise<ModuleRegistryEntry>;
}
