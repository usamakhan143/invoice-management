// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { EmptyState } from "../states/EmptyState";
import { FormField } from "../forms/FormField";
import { TextInput } from "../forms/TextInput";

describe("Button (C-001)", () => {
  it("renders label and handles click", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Create engagement</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Create engagement" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows loading state", () => {
    render(<Button loading>Create engagement</Button>);
    const button = screen.getByRole("button", { name: "Create engagement" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("FormField + TextInput (C-005, C-006)", () => {
  it("associates label and error", () => {
    render(
      <FormField label="Title" htmlFor="title" error="Required">
        <TextInput id="title" />
      </FormField>,
    );
    const input = screen.getByLabelText("Title");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});

describe("EmptyState (C-080)", () => {
  it("renders title and action", () => {
    render(
      <EmptyState
        title="No engagements yet"
        description="Create your first delivery engagement."
        action={<Button>Create engagement</Button>}
      />,
    );
    expect(screen.getByText("No engagements yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create engagement" })).toBeInTheDocument();
  });
});
