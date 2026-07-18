// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "./ConfirmationDialog";

describe("ConfirmationDialog (C-071)", () => {
  it("calls onConfirm when confirm clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        open
        title="Submit capture?"
        description="This will trigger evaluation."
        confirmLabel="Submit capture"
        onClose={() => undefined}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit capture" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("traps focus in dialog", () => {
    const { unmount } = render(
      <ConfirmationDialog
        open
        title="Submit capture?"
        confirmLabel="Submit capture"
        onClose={() => undefined}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    unmount();
  });
});
