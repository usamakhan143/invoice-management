import { describe, expect, it } from "vitest";
import { aosQueryKeys } from "./keys";

describe("dashboard query keys", () => {
  it("uses founder dashboard key", () => {
    expect(aosQueryKeys.dashboard()).toEqual(["aos", "dashboard", "founder"]);
  });
});
