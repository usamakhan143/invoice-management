import { describe, expect, it } from "vitest";
import {
  formatVersionStrategy,
  resolvePromotedAssetHref,
  statusChipVariant,
} from "./learningReviewLabels";

describe("learningReviewLabels", () => {
  it("resolves canonical target navigation hrefs", () => {
    expect(resolvePromotedAssetHref("knowledge_pattern", "pat-1")).toBe(
      "/aos/knowledge?pattern=pat-1",
    );
    expect(resolvePromotedAssetHref("module_registry", "mod-1")).toBe("/aos/registry/mod-1");
    expect(resolvePromotedAssetHref("prompt_template", "tpl-1")).toBe(
      "/aos/playbook?entry=tpl-1",
    );
    expect(resolvePromotedAssetHref("playbook", "pb-1")).toBe("/aos/playbook?entry=pb-1");
    expect(resolvePromotedAssetHref("evaluation_rubric", "rub-1")).toBe(
      "/aos/playbook?entry=rub-1",
    );
  });

  it("maps status to chip variants for accessible labeling", () => {
    expect(statusChipVariant("pending_review")).toBe("warning");
    expect(statusChipVariant("promotion_failed")).toBe("error");
    expect(statusChipVariant("promoted")).toBe("approved");
  });

  it("formats version strategy for founder-readable promotion copy", () => {
    expect(formatVersionStrategy("new_version")).toBe("Create new version");
    expect(formatVersionStrategy("supersede")).toBe("Supersede existing asset");
  });
});
