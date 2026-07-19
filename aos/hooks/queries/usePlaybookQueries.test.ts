import { describe, expect, it } from "vitest";
import { aosQueryKeys } from "./keys";
import { playbookListFiltersToQueryKey } from "./playbookListFilters";

describe("playbook query keys", () => {
  it("serializes playbook list filters", () => {
    expect(
      aosQueryKeys.playbook.list(
        playbookListFiltersToQueryKey({ search: "intake", entryType: "template" }),
      ),
    ).toEqual([
      "aos",
      "playbook",
      "list",
      { search: "intake", entryType: "template", lifecyclePhase: null, agencyType: null },
    ]);
  });
});
