import type { KnowledgeRepository } from "../../contracts/KnowledgeRepository";
import type { AosReadScope } from "../types";
import type {
  KnowledgeDetailDto,
  KnowledgeListDto,
  ListKnowledgeQuery,
} from "./dto/KnowledgeDto";
import { filterAndRankKnowledgeItems } from "./knowledgeSearch";
import { toKnowledgeListItem } from "./knowledgeSeed";

export interface KnowledgeApplicationServiceDeps {
  repository: KnowledgeRepository;
}

export class KnowledgeApplicationService {
  private readonly repository: KnowledgeRepository;

  constructor(deps: KnowledgeApplicationServiceDeps) {
    this.repository = deps.repository;
  }

  async listKnowledge(
    scope: AosReadScope,
    query: ListKnowledgeQuery = {},
  ): Promise<KnowledgeListDto> {
    const catalog = await this.repository.listAll(scope);
    let items = catalog.map(toKnowledgeListItem);

    if (query.agencyType) {
      items = items.filter((item) => item.agencyTypes.includes(query.agencyType!));
    }

    items = filterAndRankKnowledgeItems(items, query.search);

    return { items, totalCount: items.length };
  }

  async getKnowledge(
    scope: AosReadScope,
    patternId: string,
  ): Promise<KnowledgeDetailDto | null> {
    return this.repository.findById(scope, patternId);
  }
}
