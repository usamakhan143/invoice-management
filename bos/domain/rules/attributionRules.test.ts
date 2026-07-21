import { describe, expect, it } from "vitest";
import { ATTRIBUTION_SOURCE_TYPE } from "../../constants/attributionSourceType";
import { ATTRIBUTION_STATUS } from "../../constants/attributionStatus";
import type { BosAttribution } from "../entities/attribution";
import {
  validateAttributionSplitTotal,
  validateNoDuplicateActiveAttribution,
} from "./attributionRules";

function attribution(
  overrides: Partial<BosAttribution> & Pick<BosAttribution, "sourceId" | "allocationPercent">,
): BosAttribution {
  return {
    id: "attr-1",
    companyId: "c1",
    initiativeId: "init-1",
    ventureId: "ven-1",
    sourceType: ATTRIBUTION_SOURCE_TYPE.EXPENSE,
    status: ATTRIBUTION_STATUS.ACTIVE,
    attributedById: "u1",
    createdById: "u1",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("validateAttributionSplitTotal", () => {
  it("allows linking a new expense to an initiative at 100% when that source has no prior attributions", () => {
    const result = validateAttributionSplitTotal([], 100);
    expect(result.ok).toBe(true);
  });

  it("allows many expenses on one initiative because validation is scoped per source", () => {
    const existingForNewSource: BosAttribution[] = [];

    const result = validateAttributionSplitTotal(existingForNewSource, 100);

    expect(result.ok).toBe(true);
  });

  it("blocks split allocations on the same source when total exceeds 100%", () => {
    const existingForSource = [
      attribution({ sourceId: "expense-a", allocationPercent: 60, initiativeId: "init-1" }),
    ];

    const result = validateAttributionSplitTotal(existingForSource, 50);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("ATTRIBUTION_SPLIT_EXCEEDS_MAX");
    }
  });

  it("allows split allocations on the same source when total equals 100%", () => {
    const existingForSource = [
      attribution({ sourceId: "expense-a", allocationPercent: 60, initiativeId: "init-1" }),
    ];

    const result = validateAttributionSplitTotal(existingForSource, 40);

    expect(result.ok).toBe(true);
  });
});

describe("validateNoDuplicateActiveAttribution", () => {
  it("blocks a second active attribution for the same source in Phase 1", () => {
    const existingForSource = [
      attribution({ sourceId: "expense-a", allocationPercent: 100, initiativeId: "init-1" }),
    ];

    const result = validateNoDuplicateActiveAttribution(existingForSource);

    expect(result.ok).toBe(false);
  });
});
