import { describe, expect, it } from "vitest";
import { aosQueryKeys } from "./keys";
import { knowledgeListFiltersToQueryKey } from "./knowledgeListFilters";

describe("knowledge query keys", () => {
  it("serializes knowledge list filters", () => {
    expect(
      aosQueryKeys.knowledge.list(
        knowledgeListFiltersToQueryKey({ search: "auth", agencyType: "web" }),
      ),
    ).toEqual([
      "aos",
      "knowledge",
      "list",
      { search: "auth", agencyType: "web" },
    ]);
  });
});
