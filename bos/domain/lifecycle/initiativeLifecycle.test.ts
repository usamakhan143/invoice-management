import { describe, expect, it } from "vitest";
import { INITIATIVE_STATUS } from "../../constants/initiativeStatus";
import { isInitiativeTransitionAllowed, isInvalidInitiativeTransition } from "../lifecycle/initiativeLifecycle";

describe("initiativeLifecycle", () => {
  it("allows draft → active", () => {
    expect(
      isInitiativeTransitionAllowed(INITIATIVE_STATUS.DRAFT, INITIATIVE_STATUS.ACTIVE),
    ).toBe(true);
  });

  it("forbids closed → active", () => {
    expect(isInvalidInitiativeTransition(INITIATIVE_STATUS.CLOSED, INITIATIVE_STATUS.ACTIVE)).toBe(
      true,
    );
    expect(
      isInitiativeTransitionAllowed(INITIATIVE_STATUS.CLOSED, INITIATIVE_STATUS.ACTIVE),
    ).toBe(false);
  });
});
