import { describe, expect, it } from "vitest";
import { DELIVERY_STATE } from "../deliveryState";
import {
  getDeliveryEngagementNextStatus,
  isDeliveryEngagementTransitionAllowed,
  isInvalidDeliveryEngagementTransition,
} from "../lifecycle/deliveryEngagementLifecycle";

describe("deliveryEngagementLifecycle", () => {
  it("allows draft → intake", () => {
    expect(
      getDeliveryEngagementNextStatus(DELIVERY_STATE.DRAFT, "start_intake"),
    ).toBe(DELIVERY_STATE.INTAKE);
  });

  it("allows full forward path through closed", () => {
    expect(
      getDeliveryEngagementNextStatus(DELIVERY_STATE.INTAKE, "start_discovery"),
    ).toBe(DELIVERY_STATE.DISCOVERY);
    expect(
      getDeliveryEngagementNextStatus(DELIVERY_STATE.DISCOVERY, "approve_requirements"),
    ).toBe(DELIVERY_STATE.PLANNING);
    expect(
      getDeliveryEngagementNextStatus(DELIVERY_STATE.PLANNING, "approve_prompt_pack"),
    ).toBe(DELIVERY_STATE.BUILDING);
    expect(
      getDeliveryEngagementNextStatus(DELIVERY_STATE.HANDOFF, "submit_retrospective"),
    ).toBe(DELIVERY_STATE.CLOSED);
  });

  it("allows pause and resume", () => {
    expect(getDeliveryEngagementNextStatus(DELIVERY_STATE.BUILDING, "pause")).toBe(
      DELIVERY_STATE.PAUSED,
    );
    expect(
      getDeliveryEngagementNextStatus(DELIVERY_STATE.PAUSED, "resume", DELIVERY_STATE.BUILDING),
    ).toBe(DELIVERY_STATE.BUILDING);
    expect(
      isDeliveryEngagementTransitionAllowed(
        DELIVERY_STATE.PAUSED,
        DELIVERY_STATE.BUILDING,
        DELIVERY_STATE.BUILDING,
      ),
    ).toBe(true);
  });

  it("forbids closed → building resurrection", () => {
    expect(
      isInvalidDeliveryEngagementTransition(DELIVERY_STATE.CLOSED, DELIVERY_STATE.BUILDING),
    ).toBe(true);
    expect(
      isDeliveryEngagementTransitionAllowed(DELIVERY_STATE.CLOSED, DELIVERY_STATE.BUILDING),
    ).toBe(false);
  });

  it("forbids backward transitions", () => {
    expect(
      isInvalidDeliveryEngagementTransition(DELIVERY_STATE.BUILDING, DELIVERY_STATE.PLANNING),
    ).toBe(true);
  });
});
