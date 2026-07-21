import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeliveryApplicationService } from "../../application/delivery/DeliveryApplicationService";
import { AosDeliveryApplicationError } from "../../application/delivery/errors";
import { DELIVERY_STATE } from "../../domain/delivery/deliveryState";
import { EMPTY_DELIVERY_ARTIFACT_REFS } from "../../domain/delivery/valueObjects";
import { CustomerReadAdapter } from "../adapters/CustomerReadAdapter";
import { InitiativeReadAdapter } from "../adapters/InitiativeReadAdapter";
import { LeadReadAdapter } from "../adapters/LeadReadAdapter";
import { UserReadAdapter } from "../adapters/UserReadAdapter";
import { AosRepositoryError } from "../firestore/errors";
import {
  deliveryEngagementFromFirestore,
  deliveryEngagementToFirestore,
} from "../firestore/models/deliveryEngagementDocument";
import { DeliveryEngagementFirestoreRepository } from "../firestore/repositories/DeliveryEngagementFirestoreRepository";
import { createAosDeliveryReadPorts } from "../wiring/createAosDeliveryReadPorts";
import {
  clearAosIntegrationCollections,
  createAosEmulatorHarness,
  isEmulatorConfigured,
  OTHER_COMPANY_ID,
  seedErpBosReadFixtures,
  type AosEmulatorHarness,
} from "../testing/emulatorHarness";

const describeIntegration = isEmulatorConfigured() ? describe : describe.skip;

function actorScope(harness: AosEmulatorHarness) {
  return {
    companyId: harness.companyId,
    actorUserId: harness.userId,
  };
}

function readScope(harness: AosEmulatorHarness) {
  return { companyId: harness.companyId };
}

describeIntegration("AOS Delivery stack (Firestore emulator)", () => {
  let harness: AosEmulatorHarness;
  let engagements: DeliveryEngagementFirestoreRepository;
  let service: DeliveryApplicationService;
  let customers: CustomerReadAdapter;
  let leads: LeadReadAdapter;
  let users: UserReadAdapter;
  let initiatives: InitiativeReadAdapter;

  beforeEach(async () => {
    harness = await createAosEmulatorHarness();
    engagements = new DeliveryEngagementFirestoreRepository(harness.db);
    const readPorts = createAosDeliveryReadPorts({ firestore: harness.db });
    service = new DeliveryApplicationService({ engagements, readPorts });
    customers = readPorts.customers as CustomerReadAdapter;
    leads = readPorts.leads as LeadReadAdapter;
    users = readPorts.users as UserReadAdapter;
    initiatives = readPorts.initiatives as InitiativeReadAdapter;

    await clearAosIntegrationCollections(harness.db);
    await seedErpBosReadFixtures(harness.db, harness.companyId, {
      customerId: harness.customerId,
      leadId: harness.leadId,
      initiativeId: harness.initiativeId,
      userId: harness.userId,
    });
  });

  afterEach(async () => {
    await clearAosIntegrationCollections(harness.db);
    await harness.cleanupApp();
  });

  it("creates delivery engagement through application → repository → Firestore", async () => {
    const created = await service.createEngagement(actorScope(harness), {
      title: "Integration Engagement",
      scopeSummary: "End-to-end verification",
      erpCustomerId: harness.customerId,
      erpLeadId: harness.leadId,
      deliveryLeadUserId: harness.userId,
      bosInitiativeId: harness.initiativeId,
    });

    expect(created.status).toBe(DELIVERY_STATE.DRAFT);
    expect(created.companyId).toBe(harness.companyId);
    expect(created.erpCustomerId).toBe(harness.customerId);
    expect(created.bosVentureId).toBe("aos-test-venture");

    const snap = await harness.db
      .collection("aosDeliveryEngagements")
      .doc(created.id)
      .get();
    expect(snap.exists).toBe(true);
    const roundTrip = deliveryEngagementFromFirestore(snap.id, snap.data());
    expect(roundTrip?.title).toBe("Integration Engagement");
  });

  it("updates delivery engagement metadata", async () => {
    const created = await service.createEngagement(actorScope(harness), {
      title: "Before Update",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
    });

    const updated = await service.updateEngagement(
      actorScope(harness),
      created.id,
      {
        title: "After Update",
        scopeSummary: "Updated scope",
        updatedById: harness.userId,
      },
    );

    expect(updated.title).toBe("After Update");
    expect(updated.scopeSummary).toBe("Updated scope");
  });

  it("pauses and resumes through domain aggregate and repository save", async () => {
    const created = await service.createEngagement(actorScope(harness), {
      title: "Pause Resume",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
    });

    await service.advanceLifecycle(actorScope(harness), created.id, {
      event: "start_intake",
      artifacts: EMPTY_DELIVERY_ARTIFACT_REFS,
    });

    const paused = await service.pauseEngagement(actorScope(harness), created.id, {});
    expect(paused.status).toBe(DELIVERY_STATE.PAUSED);
    expect(paused.pausedFromState).toBe(DELIVERY_STATE.INTAKE);
    expect(paused.pausedAt).toBeTypeOf("number");

    const resumed = await service.resumeEngagement(actorScope(harness), created.id, {});
    expect(resumed.status).toBe(DELIVERY_STATE.INTAKE);
    expect(resumed.pausedFromState).toBeUndefined();
    expect(resumed.pausedAt).toBeUndefined();
  });

  it("cancels engagement and preserves record (append-only)", async () => {
    const created = await service.createEngagement(actorScope(harness), {
      title: "Cancel Me",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
    });

    const cancelled = await service.cancelEngagement(actorScope(harness), created.id, {
      cancelReason: "Verification cancel",
    });

    expect(cancelled.status).toBe(DELIVERY_STATE.CANCELLED);
    expect(cancelled.cancelReason).toBe("Verification cancel");

    const stillThere = await engagements.findById(harness.companyId, created.id);
    expect(stillThere?.status).toBe(DELIVERY_STATE.CANCELLED);

    const listed = await service.listCompanyDeliveries(readScope(harness), {
      limit: 25,
      status: DELIVERY_STATE.CANCELLED,
    });
    expect(listed.items.some((row) => row.id === created.id)).toBe(true);
  });

  it("advances lifecycle forward with artifact gates", async () => {
    const created = await service.createEngagement(actorScope(harness), {
      title: "Lifecycle Path",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
    });

    const intake = await service.advanceLifecycle(actorScope(harness), created.id, {
      event: "start_intake",
      artifacts: EMPTY_DELIVERY_ARTIFACT_REFS,
    });
    expect(intake.status).toBe(DELIVERY_STATE.INTAKE);

    const discovery = await service.advanceLifecycle(actorScope(harness), created.id, {
      event: "start_discovery",
      artifacts: EMPTY_DELIVERY_ARTIFACT_REFS,
    });
    expect(discovery.status).toBe(DELIVERY_STATE.DISCOVERY);

    const planning = await service.advanceLifecycle(actorScope(harness), created.id, {
      event: "approve_requirements",
      artifacts: {
        ...EMPTY_DELIVERY_ARTIFACT_REFS,
        hasApprovedRequirementSet: true,
        activeNonSupersededRequirementSetCount: 1,
      },
    });
    expect(planning.status).toBe(DELIVERY_STATE.PLANNING);
  });

  it("rejects create when ERP customer belongs to another company", async () => {
    await expect(
      service.createEngagement(actorScope(harness), {
        title: "Foreign Customer",
        erpCustomerId: "other-company-customer",
        deliveryLeadUserId: harness.userId,
      }),
    ).rejects.toBeInstanceOf(AosDeliveryApplicationError);
  });

  it("enforces repository company isolation on findById", async () => {
    const created = await service.createEngagement(actorScope(harness), {
      title: "Tenant Check",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
    });

    await expect(engagements.findById(OTHER_COMPANY_ID, created.id)).rejects.toBeInstanceOf(
      AosRepositoryError,
    );
  });

  it("enforces read-port company isolation (not found for foreign tenant)", async () => {
    expect(await customers.customerExists(OTHER_COMPANY_ID, harness.customerId)).toBe(false);
    expect(await customers.getCustomerSummary(OTHER_COMPANY_ID, harness.customerId)).toBeNull();

    expect(await leads.leadExists(OTHER_COMPANY_ID, harness.leadId)).toBe(false);
    expect(await initiatives.initiativeExists(OTHER_COMPANY_ID, harness.initiativeId)).toBe(false);
    expect(await users.userExists(OTHER_COMPANY_ID, harness.userId)).toBe(false);
  });

  it("maps repository not-found to application repository error", async () => {
    await expect(
      service.updateEngagement(actorScope(harness), "missing-engagement", {
        title: "Nope",
        updatedById: harness.userId,
      }),
    ).rejects.toMatchObject({
      code: "DELIVERY_NOT_FOUND",
    });
  });

  it("repository save round-trips cleared pause fields after resume", async () => {
    const created = await engagements.create({
      companyId: harness.companyId,
      title: "Repo Save",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
      createdById: harness.userId,
    });

    const pausedEntity = {
      ...created,
      status: DELIVERY_STATE.PAUSED,
      pausedFromState: DELIVERY_STATE.DRAFT,
      pausedAt: Date.now(),
      updatedAt: Date.now(),
      updatedById: harness.userId,
    };
    await engagements.save(harness.companyId, pausedEntity);

    const resumedEntity = {
      ...pausedEntity,
      status: DELIVERY_STATE.DRAFT,
      pausedFromState: undefined,
      pausedAt: undefined,
      updatedAt: Date.now(),
    };
    const saved = await engagements.save(harness.companyId, resumedEntity);

    expect(saved.status).toBe(DELIVERY_STATE.DRAFT);
    expect(saved.pausedFromState).toBeUndefined();
    expect(saved.pausedAt).toBeUndefined();

    const raw = await harness.db.collection("aosDeliveryEngagements").doc(saved.id).get();
    expect(raw.data()?.pausedFromState).toBeUndefined();
    expect(raw.data()?.pausedAt).toBeUndefined();
  });

  it("converter round-trip matches repository-loaded entity", async () => {
    const created = await engagements.create({
      companyId: harness.companyId,
      title: "Converter Round Trip",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
      createdById: harness.userId,
    });

    const snap = await harness.db.collection("aosDeliveryEngagements").doc(created.id).get();
    const fromFirestore = deliveryEngagementFromFirestore(snap.id, snap.data());
    const toDoc = deliveryEngagementToFirestore(created);
    const fromDoc = deliveryEngagementFromFirestore(created.id, toDoc);

    expect(fromFirestore).toEqual(created);
    expect(fromDoc).toEqual(created);
  });
});
