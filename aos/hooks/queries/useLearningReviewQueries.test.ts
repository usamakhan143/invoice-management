import { describe, expect, it } from "vitest";
import { aosQueryKeys } from "./keys";
import { learningReviewFiltersToQueryKey } from "./learningReviewFilters";

describe("learning review query keys", () => {
  it("serializes review queue filters", () => {
    expect(
      aosQueryKeys.learning.reviewQueue(
        learningReviewFiltersToQueryKey({
          search: "auth",
          status: "pending_review",
          candidateType: "knowledge_pattern",
          confidence: "promotion_eligible",
          targetKind: "knowledge_pattern",
          candidateId: "cand-1",
        }),
      ),
    ).toEqual([
      "aos",
      "learning",
      "review-queue",
      {
        search: "auth",
        status: "pending_review",
        candidateType: "knowledge_pattern",
        confidence: "promotion_eligible",
        targetKind: "knowledge_pattern",
        candidateId: "cand-1",
      },
    ]);
  });
});
