import type { KnowledgeRepository } from "../../contracts/KnowledgeRepository";
import type { ModuleRegistryRepository } from "../../contracts/ModuleRegistryRepository";
import type { PlaybookRepository } from "../../contracts/PlaybookRepository";
import type { CompanyReadScope } from "../../contracts/readScope";
import type { KnowledgePattern } from "../../domain/catalog/entities/knowledgePattern";
import type { ModuleRegistryEntry } from "../../domain/catalog/entities/moduleRegistry";
import type { PlaybookEntry } from "../../domain/catalog/entities/playbookEntry";
import { getKnowledgeSeedCatalog } from "../../domain/catalog/seeds/knowledgePatternSeed";
import { getModuleRegistrySeedCatalog } from "../../domain/catalog/seeds/moduleRegistrySeed";
import { getPlaybookSeedCatalog } from "../../domain/catalog/seeds/playbookEntrySeed";

/** Test doubles for catalog repositories — company-scoped in-memory copies of seed data. */
export class InMemoryModuleRegistryRepository implements ModuleRegistryRepository {
  private seededCompanies = new Set<string>();

  async ensureSeeded(scope: CompanyReadScope): Promise<void> {
    this.seededCompanies.add(scope.companyId);
  }

  async listAll(scope: CompanyReadScope): Promise<readonly ModuleRegistryEntry[]> {
    await this.ensureSeeded(scope);
    return getModuleRegistrySeedCatalog();
  }

  async findById(scope: CompanyReadScope, moduleId: string): Promise<ModuleRegistryEntry | null> {
    await this.ensureSeeded(scope);
    return getModuleRegistrySeedCatalog().find((item) => item.moduleId === moduleId) ?? null;
  }
}

export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  async ensureSeeded(_scope: CompanyReadScope): Promise<void> {}

  async listAll(_scope: CompanyReadScope): Promise<readonly KnowledgePattern[]> {
    return getKnowledgeSeedCatalog();
  }

  async findById(_scope: CompanyReadScope, patternId: string): Promise<KnowledgePattern | null> {
    return getKnowledgeSeedCatalog().find((item) => item.patternId === patternId) ?? null;
  }
}

export class InMemoryPlaybookRepository implements PlaybookRepository {
  async ensureSeeded(_scope: CompanyReadScope): Promise<void> {}

  async listAll(_scope: CompanyReadScope): Promise<readonly PlaybookEntry[]> {
    return getPlaybookSeedCatalog();
  }

  async findById(_scope: CompanyReadScope, entryId: string): Promise<PlaybookEntry | null> {
    return getPlaybookSeedCatalog().find((item) => item.entryId === entryId) ?? null;
  }
}
