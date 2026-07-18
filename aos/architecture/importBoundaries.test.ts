import { describe, expect, it } from "vitest";
import { verifyAosImportBoundaries } from "./verifyImportBoundaries";

describe("AOS import boundaries", () => {
  it("passes frozen layer rules across aos/", () => {
    const result = verifyAosImportBoundaries();
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
