// @vitest-environment jsdom
import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { VersionHistoryPanel } from "./VersionHistoryPanel";

describe("VersionHistoryPanel (E3)", () => {
  it("has no axe violations in list state", async () => {
    const { container } = render(
      <VersionHistoryPanel
        title="Requirement version history"
        rows={[
          {
            id: "v1",
            primaryLabel: "Requirement v1",
            statusLabel: "Historical",
            timestamp: Date.now(),
            readOnly: true,
          },
        ]}
        renderDetail={() => <p>Detail</p>}
      />,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it("shows compatibility message when disabled", () => {
    const { getByText } = render(
      <VersionHistoryPanel
        title="History"
        rows={[]}
        disabledMessage="Version chains disabled"
        renderDetail={vi.fn()}
      />,
    );
    expect(getByText("Version chains disabled")).toBeTruthy();
  });
});
