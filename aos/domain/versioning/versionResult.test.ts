import { describe, expect, it } from "vitest";
import { assertMonotonicVersionNumber, assertSameCompany, freezePublishedRecord } from "./versionResult";

describe("version invariants V-01 through V-15 (E1 domain)", () => {
  it("V-01/V-15: published records are frozen and exact", () => {
    const record = freezePublishedRecord({ id: "1", nested: { value: "x" } });
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen((record as { nested: object }).nested)).toBe(true);
  });

  it("V-04: monotonic version numbering rejects duplicate and skip", () => {
    expect(assertMonotonicVersionNumber([1, 2], 3).ok).toBe(true);
    expect(assertMonotonicVersionNumber([1, 2], 2).ok).toBe(false);
    expect(assertMonotonicVersionNumber([1, 2], 4).ok).toBe(false);
  });

  it("V-11: companyId consistency enforced", () => {
    const result = assertSameCompany("co1", "co2", "Test");
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("VERSION_COMPANY_MISMATCH");
  });
});
