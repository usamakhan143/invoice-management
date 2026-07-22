import type { CompanyId } from "../types";
import type { KnowledgePattern } from "../domain/catalog/entities/knowledgePattern";

export interface PublishKnowledgeFromPromotionCommand {
  companyId: CompanyId;
  pattern: KnowledgePattern;
  markStalePatternId?: string;
}

export interface KnowledgeRepository {
  ensureSeeded(scope: import("./readScope").CompanyReadScope): Promise<void>;
  listAll(scope: import("./readScope").CompanyReadScope): Promise<readonly KnowledgePattern[]>;
  findById(
    scope: import("./readScope").CompanyReadScope,
    patternId: string,
  ): Promise<KnowledgePattern | null>;
  publishFromPromotion(
    command: PublishKnowledgeFromPromotionCommand,
  ): Promise<KnowledgePattern>;
}
