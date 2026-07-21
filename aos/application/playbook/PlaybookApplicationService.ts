import type { PlaybookRepository } from "../../contracts/PlaybookRepository";
import type { AosReadScope } from "../types";
import type {
  ListPlaybookQuery,
  PlaybookEntryDetailDto,
  PlaybookListDto,
} from "./dto/PlaybookDto";
import { filterAndRankPlaybookEntries } from "./playbookSearch";
import { toPlaybookListItem } from "./playbookSeed";

export interface PlaybookApplicationServiceDeps {
  repository: PlaybookRepository;
}

export class PlaybookApplicationService {
  private readonly repository: PlaybookRepository;

  constructor(deps: PlaybookApplicationServiceDeps) {
    this.repository = deps.repository;
  }

  async listEntries(scope: AosReadScope, query: ListPlaybookQuery = {}): Promise<PlaybookListDto> {
    const catalog = await this.repository.listAll(scope);
    let items = catalog.map(toPlaybookListItem);

    if (query.entryType) {
      items = items.filter((item) => item.entryType === query.entryType);
    }
    if (query.lifecyclePhase) {
      items = items.filter((item) => item.lifecyclePhase === query.lifecyclePhase);
    }
    if (query.agencyType) {
      items = items.filter((item) => item.agencyTypes.includes(query.agencyType!));
    }

    items = filterAndRankPlaybookEntries(items, query.search);

    return { items, totalCount: items.length };
  }

  async getEntry(scope: AosReadScope, entryId: string): Promise<PlaybookEntryDetailDto | null> {
    return this.repository.findById(scope, entryId);
  }
}
