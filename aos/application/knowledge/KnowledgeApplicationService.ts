import type { AosReadScope } from "../types";
import type {
  KnowledgeDetailDto,
  KnowledgeListDto,
  ListKnowledgeQuery,
} from "./dto/KnowledgeDto";
import { filterAndRankKnowledgeItems } from "./knowledgeSearch";
import { getKnowledgeSeedCatalog, toKnowledgeListItem } from "./knowledgeSeed";

/** Phase 1A knowledge library — in-memory seed; no Firestore. */
export class KnowledgeApplicationService {
  private catalogForCompany(_scope: AosReadScope): readonly KnowledgeDetailDto[] {
    return getKnowledgeSeedCatalog();
  }

  async listKnowledge(
    scope: AosReadScope,
    query: ListKnowledgeQuery = {},
  ): Promise<KnowledgeListDto> {
    let items = this.catalogForCompany(scope).map(toKnowledgeListItem);

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
    return this.catalogForCompany(scope).find((item) => item.patternId === patternId) ?? null;
  }
}
