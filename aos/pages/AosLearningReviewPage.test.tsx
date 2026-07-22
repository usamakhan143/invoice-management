// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AOS_ROUTE_ID } from "../config/routes";
import { AosRouteGate } from "../presentation/gates";

vi.mock("../../hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

describe("AosLearningReviewPage route gate", () => {
  it("does not render queue content when LEARNING_ENGINE is disabled by default", () => {
    render(
      <MemoryRouter>
        <AosRouteGate routeId={AOS_ROUTE_ID.LEARNING}>
          <div>Learning queue content</div>
        </AosRouteGate>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Learning queue content")).not.toBeInTheDocument();
  });
});
