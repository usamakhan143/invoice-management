import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { VENTURE_STATUS } from "../../constants/ventureStatus";
import { validateCreateVenture, validateVentureStatusTransition } from "./ventureRules";
import { validateUpdateVenture, validateVentureArchivePrerequisites } from "./ventureRules";

describe("ventureRules", () => {
  it("rejects empty venture name on create", () => {
    const result = validateCreateVenture({
      companyId: "c1",
      name: "  ",
      ownerUserId: "o1",
      createdById: "u1",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects empty name on update", () => {
    const result = validateUpdateVenture({ name: "", updatedById: "u1" });
    expect(result.ok).toBe(false);
  });

  it("blocks archived → active resurrection", () => {
    const result = validateVentureStatusTransition(
      {
        id: "v1",
        companyId: "c1",
        name: "V",
        status: VENTURE_STATUS.ARCHIVED,
        ownerUserId: "o1",
        createdById: "u1",
        createdAt: 1,
        updatedAt: 1,
      },
      VENTURE_STATUS.ACTIVE,
    );
    expect(result.ok).toBe(false);
  });

  it("requires initiatives closed before archive", () => {
    const result = validateVentureArchivePrerequisites({ openInitiativeCount: 2 });
    expect(result.ok).toBe(false);
  });
});
