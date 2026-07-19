import { describe, expect, it } from "vitest";
import { deliveryListFiltersToQueryKey } from "./deliveryListFilters";

describe("deliveryListFiltersToQueryKey", () => {
  it("serializes filters for TanStack Query keys", () => {
    expect(
      deliveryListFiltersToQueryKey({
        search: "acme",
        status: "draft",
        leadUserId: "user-1",
        customerId: "cust-1",
        sortField: "updatedAt",
        sortDirection: "desc",
        cursor: "cursor-1",
        limit: 25,
      }),
    ).toEqual({
      search: "acme",
      status: "draft",
      leadUserId: "user-1",
      customerId: "cust-1",
      sortField: "updatedAt",
      sortDirection: "desc",
      cursor: "cursor-1",
      limit: 25,
    });
  });
});
