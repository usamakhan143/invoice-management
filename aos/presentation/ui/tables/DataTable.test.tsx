// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";
import { EmptyState } from "../states/EmptyState";
import { Button } from "../buttons/Button";

interface Row {
  id: string;
  name: string;
}

describe("DataTable (C-012)", () => {
  const columns = [
    { id: "name", header: "Name", cell: (row: Row) => row.name },
  ];

  it("renders rows and handles row click", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Acme" }]}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Acme" }));
    expect(onRowClick).toHaveBeenCalledWith({ id: "1", name: "Acme" });
  });

  it("renders empty state", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyState={
          <EmptyState
            title="No data"
            action={<Button>Create</Button>}
          />
        }
      />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
