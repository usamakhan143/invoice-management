import { describe, expect, it } from "vitest";
import { PlaybookApplicationService } from "./PlaybookApplicationService";
import { filterAndRankPlaybookEntries } from "./playbookSearch";
import { getPlaybookSeedCatalog, toPlaybookListItem } from "./playbookSeed";

import { InMemoryPlaybookRepository } from "../../infrastructure/testing/inMemoryCatalogRepositories";

describe("PlaybookApplicationService", () => {
  const scope = { companyId: "co1" };
  const service = new PlaybookApplicationService({
    repository: new InMemoryPlaybookRepository(),
  });

  it("lists seeded playbook entries", async () => {
    const result = await service.listEntries(scope, {});
    expect(result.totalCount).toBeGreaterThan(5);
  });

  it("returns entry detail", async () => {
    const detail = await service.getEntry(scope, "pb-agency-core");
    expect(detail?.title).toBe("Agency Delivery Playbook");
    expect(detail?.checklist.length).toBeGreaterThan(0);
  });
});

describe("filterAndRankPlaybookEntries", () => {
  it("ranks exact entry ID first", () => {
    const items = getPlaybookSeedCatalog().map(toPlaybookListItem);
    expect(filterAndRankPlaybookEntries(items, "pb-agency-core")[0]?.entryId).toBe("pb-agency-core");
  });
});
