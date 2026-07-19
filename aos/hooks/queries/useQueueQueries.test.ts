import { describe, expect, it } from "vitest";

describe("queue query keys", () => {
  it("serializes queue filters in query keys", async () => {
    const { aosQueryKeys } = await import("./keys");
    expect(aosQueryKeys.queues.requirements({ search: "portal" })).toEqual([
      "aos",
      "queues",
      "requirements",
      { search: "portal" },
    ]);
  });
});
