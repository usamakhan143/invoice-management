import { describe, expect, it } from "vitest";
import { aosQueryKeys } from "./keys";
import { registryListFiltersToQueryKey } from "./registryListFilters";

describe("registry query keys", () => {
  it("serializes registry list filters", () => {
    expect(
      aosQueryKeys.registry.list(registryListFiltersToQueryKey({ search: "auth", status: "stable" })),
    ).toEqual([
      "aos",
      "registry",
      "list",
      { search: "auth", agencyType: null, status: "stable" },
    ]);
  });
});
