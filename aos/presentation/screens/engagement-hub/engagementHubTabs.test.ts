import { describe, expect, it } from "vitest";
import {
  getEngagementHubTabPath,
  resolveEngagementHubTabId,
} from "./engagementHubTabs";

describe("engagementHubTabs", () => {
  it("resolves overview tab from base path", () => {
    expect(resolveEngagementHubTabId("/aos/delivery/eng-1", "eng-1")).toBe("overview");
  });

  it("resolves nested tab from path suffix", () => {
    expect(resolveEngagementHubTabId("/aos/delivery/eng-1/requirements", "eng-1")).toBe(
      "requirements",
    );
  });

  it("builds tab paths", () => {
    expect(getEngagementHubTabPath("eng-1", "prompts")).toBe("/aos/delivery/eng-1/prompts");
    expect(getEngagementHubTabPath("eng-1", "")).toBe("/aos/delivery/eng-1");
  });
});
