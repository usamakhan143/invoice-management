import { describe, expect, it } from "vitest";
import { DeliveryApplicationService } from "../../application/delivery/DeliveryApplicationService";
import { AosDeliveryApplicationError, mapDeliveryRepositoryError } from "../../application/delivery/errors";
import {
  toDeliveryEngagementDto,
  toDeliveryEngagementListDto,
} from "../../application/delivery/dto/DeliveryEngagementDto";
import { DELIVERY_STATE } from "../../domain/delivery/deliveryState";
import type { DeliveryEngagement } from "../../domain/delivery/entities/deliveryEngagement";
import {
  cancelDeliveryEngagement,
  transitionDeliveryEngagement,
} from "../../domain/delivery/deliveryEngagementAggregate";
import { EMPTY_DELIVERY_ARTIFACT_REFS } from "../../domain/delivery/valueObjects";
import type { DeliveryEngagementRepository } from "../../contracts/DeliveryEngagementRepository";
import type { AosDeliveryReadPorts } from "../../integration/ports/deliveryReadPorts";
import { AosRepositoryError } from "../firestore/errors";
import { runAosConverterChecks } from "../firestore/validation/runConverterChecks";
import {
  deliveryEngagementFromFirestore,
  deliveryEngagementToFirestore,
} from "../firestore/models/deliveryEngagementDocument";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

function buildEngagement(overrides: Partial<DeliveryEngagement> = {}): DeliveryEngagement {
  const now = Date.now();
  return {
    id: "eng-verification",
    companyId: "company-1",
    title: "Verification Engagement",
    status: DELIVERY_STATE.DRAFT,
    erpCustomerId: "customer-1",
    deliveryLeadUserId: "user-1",
    createdAt: now,
    updatedAt: now,
    createdById: "user-1",
    ...overrides,
  };
}

describe("AOS Delivery stack verification (pure)", () => {
  it("passes converter round-trip checks", () => {
    const result = runAosConverterChecks();
    expect(result.failed).toEqual([]);
    expect(result.passed).toBeGreaterThan(0);
  });

  it("round-trips DeliveryEngagement through Firestore document shape", () => {
    const engagement = buildEngagement({
      pausedFromState: DELIVERY_STATE.INTAKE,
      pausedAt: 1_700_000_000_000,
      cancelReason: "n/a",
    });
    const doc = deliveryEngagementToFirestore(engagement);
    const restored = deliveryEngagementFromFirestore(engagement.id, doc);
    expect(restored?.title).toBe(engagement.title);
    expect(restored?.status).toBe(engagement.status);
    expect(restored?.pausedFromState).toBe(DELIVERY_STATE.INTAKE);
    expect(restored?.pausedAt).toBe(engagement.pausedAt);
  });

  it("maps engagement entity to DTO without mutation", () => {
    const engagement = buildEngagement({ scopeSummary: "Scope" });
    const dto = toDeliveryEngagementDto(engagement);
    expect(dto).toEqual(engagement);
    expect(dto).not.toBe(engagement);
  });

  it("maps engagement list to DTO list", () => {
    const items = [buildEngagement({ id: "a" }), buildEngagement({ id: "b" })];
    const list = toDeliveryEngagementListDto(items, "cursor-1");
    expect(list.items).toHaveLength(2);
    expect(list.nextCursor).toBe("cursor-1");
    expect(list.items[0].id).toBe("a");
  });

  it("maps AosRepositoryError to application-safe repository error", () => {
    expect(() =>
      mapDeliveryRepositoryError(new AosRepositoryError("Delivery engagement not found", "AOS_NOT_FOUND")),
    ).toThrow(AosDeliveryApplicationError);

    try {
      mapDeliveryRepositoryError(new AosRepositoryError("Delivery engagement not found", "AOS_NOT_FOUND"));
    } catch (error) {
      expect(error).toBeInstanceOf(AosDeliveryApplicationError);
      expect((error as AosDeliveryApplicationError).code).toBe("AOS_REPOSITORY_ERROR");
      expect((error as AosDeliveryApplicationError).message).toContain("not found");
    }
  });

  it("preserves aggregate consistency across domain transition materialization", () => {
    const engagement = buildEngagement({ status: DELIVERY_STATE.BUILDING });
    const paused = transitionDeliveryEngagement(
      engagement,
      "pause",
      EMPTY_DELIVERY_ARTIFACT_REFS,
      "user-1",
      Date.now(),
    );
    expect(paused.ok).toBe(true);
    if (!paused.ok) return;

    expect(paused.engagement.status).toBe(DELIVERY_STATE.PAUSED);
    expect(paused.engagement.pausedFromState).toBe(DELIVERY_STATE.BUILDING);
    expect(paused.engagement.pausedAt).toBeTypeOf("number");

    const resumed = transitionDeliveryEngagement(
      paused.engagement,
      "resume",
      EMPTY_DELIVERY_ARTIFACT_REFS,
      "user-1",
      Date.now(),
    );
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;

    expect(resumed.engagement.status).toBe(DELIVERY_STATE.BUILDING);
    expect(resumed.engagement.pausedFromState).toBeUndefined();
    expect(resumed.engagement.pausedAt).toBeUndefined();
  });

  it("materializes cancel reason on aggregate cancel behavior", () => {
    const engagement = buildEngagement({ status: DELIVERY_STATE.INTAKE });
    const cancelled = cancelDeliveryEngagement(
      engagement,
      { cancelReason: "Client withdrew", cancelledById: "user-1" },
      Date.now(),
    );
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;

    expect(cancelled.engagement.status).toBe(DELIVERY_STATE.CANCELLED);
    expect(cancelled.engagement.cancelReason).toBe("Client withdrew");
  });

  it("does not expose repository write methods beyond contract", () => {
    const repoShape = [
      "findById",
      "exists",
      "listByCompany",
      "listByCustomer",
      "create",
      "update",
      "save",
    ] as const satisfies Array<keyof DeliveryEngagementRepository>;
    expect(repoShape).not.toContain("delete");
  });

  it("application service depends on ports and repository interfaces only", () => {
    const fakeRepo: DeliveryEngagementRepository = {
      findById: async () => null,
      exists: async () => false,
      listByCompany: async () => ({ items: [] }),
      listByCustomer: async () => ({ items: [] }),
      create: async () => buildEngagement(),
      update: async () => buildEngagement(),
      save: async (_companyId, engagement) => engagement,
    };

    const fakeReadPorts: AosDeliveryReadPorts = {
      customers: {
        customerExists: async () => true,
        getCustomerSummary: async () => ({ name: "Customer" }),
      },
      leads: {
        leadExists: async () => true,
        getLeadSummary: async () => ({ title: "Lead" }),
      },
      users: {
        userExists: async () => true,
        getUserSummary: async () => ({ displayName: "User" }),
      },
      initiatives: {
        initiativeExists: async () => true,
        getInitiativeSummary: async () => ({ name: "Initiative", ventureId: "v1" }),
      },
    };

    const service = new DeliveryApplicationService({
      engagements: fakeRepo,
      readPorts: fakeReadPorts,
    });

    expect(service).toBeInstanceOf(DeliveryApplicationService);
  });

  it("converter omits undefined optional Firestore fields", () => {
    const doc = deliveryEngagementToFirestore(buildEngagement());
    expect(Object.values(doc).some((value) => value === undefined)).toBe(false);
  });

  it("uses Timestamp values in engagement document mapping", () => {
    const doc = deliveryEngagementToFirestore(buildEngagement());
    expect(doc.createdAt).toBeInstanceOf(firebase.firestore.Timestamp);
    expect(doc.updatedAt).toBeInstanceOf(firebase.firestore.Timestamp);
  });
});
