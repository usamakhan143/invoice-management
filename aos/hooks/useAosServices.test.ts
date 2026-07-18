import { describe, expect, it } from "vitest";
import { useAosServices } from "./useAosServices";

describe("useAosServices", () => {
  it("exports a hook function", () => {
    expect(typeof useAosServices).toBe("function");
  });
});
