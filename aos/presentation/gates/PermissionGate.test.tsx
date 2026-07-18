// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PermissionGate } from "./PermissionGate";

vi.mock("../../../hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: (key: string) => key === "allowed.key",
  }),
}));

describe("PermissionGate (C-090)", () => {
  it("renders children when permitted", () => {
    render(
      <PermissionGate permissions="allowed.key">
        <span>Visible</span>
      </PermissionGate>,
    );
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("renders fallback when denied", () => {
    render(
      <PermissionGate permissions="denied.key" fallback={<span>Hidden</span>}>
        <span>Visible</span>
      </PermissionGate>,
    );
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.queryByText("Visible")).not.toBeInTheDocument();
  });
});
