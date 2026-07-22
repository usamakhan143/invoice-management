import { describe, expect, it } from "vitest";
import { sanitizePromotableText } from "./sanitizePromotableText";

describe("sanitizePromotableText", () => {
  it("redacts email patterns", () => {
    const result = sanitizePromotableText("Contact client@example.com for details");
    expect(result.sanitized).not.toContain("client@example.com");
    expect(result.hadPiiPatterns).toBe(true);
  });

  it("preserves non-PII lesson text", () => {
    const result = sanitizePromotableText("Reuse assessment early reduced scope");
    expect(result.sanitized).toBe("Reuse assessment early reduced scope");
    expect(result.hadPiiPatterns).toBe(false);
  });
});
