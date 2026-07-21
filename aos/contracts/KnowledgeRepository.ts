import type { KnowledgePattern } from "../domain/catalog/entities/knowledgePattern";
import type { CompanyReadScope } from "./readScope";

export interface KnowledgeRepository {
  ensureSeeded(scope: CompanyReadScope): Promise<void>;
  listAll(scope: CompanyReadScope): Promise<readonly KnowledgePattern[]>;
  findById(scope: CompanyReadScope, patternId: string): Promise<KnowledgePattern | null>;
}
