// @vitest-environment jsdom
import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button accessibility (C-001)", () => {
  it("has no serious axe violations", async () => {
    const { container } = render(<Button>Review requirements</Button>);
    const results = await axe.run(container, {
      rules: {
        region: { enabled: false },
      },
    });
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious).toEqual([]);
  });
});
