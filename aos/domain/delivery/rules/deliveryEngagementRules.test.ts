import { describe, expect, it } from "vitest";
import { ENGAGEMENT_TYPE } from "../../../constants/engagementType";
import { DELIVERY_STATE } from "../deliveryState";
import { DeliveryDomainError } from "../errors";
import type { DeliveryEngagement } from "../entities/deliveryEngagement";
import {
  assertDeliveryEngagementTransition,
  isRetainerEngagement,
  validateActiveRequirementSetCount,
  validateCancelDeliveryEngagement,
  validateCreateDeliveryEngagement,
  validateCustomerIdImmutableAfterIntake,
  validateDeliveryEngagementTransition,
} from "./deliveryEngagementRules";
import { EMPTY_DELIVERY_ARTIFACT_REFS } from "../valueObjects";

const baseEngagement = (): DeliveryEngagement => ({
  id: "de-1",
  companyId: "company-1",
  title: "Client portal",
  status: DELIVERY_STATE.PLANNING,
  erpCustomerId: "cust-1",
  deliveryLeadUserId: "user-1",
  createdAt: 1,
  updatedAt: 1,
  createdById: "user-1",
});

describe("deliveryEngagementRules", () => {
  it("rejects empty title on create", () => {
    const result = validateCreateDeliveryEngagement({
      companyId: "company-1",
      title: "  ",
      erpCustomerId: "cust-1",
      deliveryLeadUserId: "user-1",
      createdById: "user-1",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects company mismatch for customer reference", () => {
    const result = validateCreateDeliveryEngagement(
      {
        companyId: "company-1",
        title: "Portal",
        erpCustomerId: "cust-1",
        deliveryLeadUserId: "user-1",
        createdById: "user-1",
      },
      { customer: { customerId: "cust-1", companyId: "other-company" } },
    );
    expect(result.ok).toBe(false);
  });

  it("blocks building without approved requirement set", () => {
    const result = validateDeliveryEngagementTransition(
      { ...baseEngagement(), status: DELIVERY_STATE.PLANNING },
      "approve_prompt_pack",
      EMPTY_DELIVERY_ARTIFACT_REFS,
    );
    expect(result.ok).toBe(false);
  });

  it("blocks close without completed retrospective", () => {
    const result = validateDeliveryEngagementTransition(
      { ...baseEngagement(), status: DELIVERY_STATE.HANDOFF },
      "submit_retrospective",
      {
        ...EMPTY_DELIVERY_ARTIFACT_REFS,
        hasApprovedRequirementSet: true,
        hasApprovedPromptPack: true,
        hasCompletedRetrospective: false,
      },
    );
    expect(result.ok).toBe(false);
  });

  it("throws DeliveryDomainError on illegal transition", () => {
    expect(() =>
      assertDeliveryEngagementTransition(
        { ...baseEngagement(), status: DELIVERY_STATE.CLOSED },
        "start_intake",
        EMPTY_DELIVERY_ARTIFACT_REFS,
      ),
    ).toThrow(DeliveryDomainError);
  });

  it("requires cancel reason", () => {
    const result = validateCancelDeliveryEngagement(baseEngagement(), {
      cancelReason: "  ",
      cancelledById: "user-1",
    });
    expect(result.ok).toBe(false);
  });

  it("blocks customer change after intake", () => {
    const result = validateCustomerIdImmutableAfterIntake(
      { ...baseEngagement(), status: DELIVERY_STATE.INTAKE },
      "cust-2",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects multiple active requirement sets", () => {
    const result = validateActiveRequirementSetCount(2);
    expect(result.ok).toBe(false);
  });

  it("identifies retainer engagements", () => {
    expect(
      isRetainerEngagement({
        ...baseEngagement(),
        engagementType: ENGAGEMENT_TYPE.MAINTENANCE,
      }),
    ).toBe(true);
  });
});
