import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { FirestoreBosVentureRepository } from "../repositories/FirestoreBosVentureRepository";
import { FirestoreBosInitiativeRepository } from "../repositories/FirestoreBosInitiativeRepository";
import { FirestoreBosDecisionRepository } from "../repositories/FirestoreBosDecisionRepository";
import { VENTURE_STATUS } from "../../../constants/ventureStatus";
import { INITIATIVE_STATUS } from "../../../constants/initiativeStatus";
import { DECISION_STATUS, DECISION_TYPE } from "../../../constants/decisionStatus";
import { BosRepositoryError } from "../errors";
import {
  clearBosCollections,
  createEmulatorHarness,
  isEmulatorConfigured,
  type EmulatorHarness,
} from "../testing/emulatorHarness";

const describeIntegration = isEmulatorConfigured() ? describe : describe.skip;

describeIntegration("BOS Firestore repositories (emulator)", () => {
  let harness: EmulatorHarness;
  let ventures: FirestoreBosVentureRepository;
  let initiatives: FirestoreBosInitiativeRepository;
  let decisions: FirestoreBosDecisionRepository;

  beforeEach(async () => {
    harness = await createEmulatorHarness();
    ventures = new FirestoreBosVentureRepository(harness.db);
    initiatives = new FirestoreBosInitiativeRepository(harness.db, ventures);
    decisions = new FirestoreBosDecisionRepository(harness.db, ventures, initiatives);
    await clearBosCollections(harness.db);
  });

  afterEach(async () => {
    await clearBosCollections(harness.db);
    await harness.cleanupApp();
  });

  it("creates venture → initiative → decision with FK validation", async () => {
    const venture = await ventures.create({
      companyId: harness.companyId,
      name: "Integration Venture",
      ownerUserId: harness.userId,
      createdById: harness.userId,
    });
    expect(venture.status).toBe(VENTURE_STATUS.PLANNED);

    const initiative = await initiatives.create({
      companyId: harness.companyId,
      ventureId: venture.id,
      name: "Integration Initiative",
      startDate: Date.parse("2026-07-01"),
      createdById: harness.userId,
    });
    expect(initiative.status).toBe(INITIATIVE_STATUS.DRAFT);

    const decision = await decisions.create({
      companyId: harness.companyId,
      initiativeId: initiative.id,
      title: "Approve budget",
      decision: "Approved",
      decisionType: DECISION_TYPE.BUDGET,
      createdById: harness.userId,
    });
    expect(decision.status).toBe(DECISION_STATUS.PROPOSED);
    expect(decision.ventureId).toBe(venture.id);
  });

  it("rejects initiative on missing venture", async () => {
    await expect(
      initiatives.create({
        companyId: harness.companyId,
        ventureId: "missing-venture",
        name: "Orphan Initiative",
        startDate: Date.parse("2026-07-01"),
        createdById: harness.userId,
      }),
    ).rejects.toBeInstanceOf(BosRepositoryError);
  });

  it("rejects invalid venture status transition", async () => {
    const venture = await ventures.create({
      companyId: harness.companyId,
      name: "Status Venture",
      ownerUserId: harness.userId,
      createdById: harness.userId,
    });

    await expect(
      ventures.updateStatus(harness.companyId, venture.id, VENTURE_STATUS.ARCHIVED, harness.userId),
    ).rejects.toBeInstanceOf(BosRepositoryError);
  });

  it("enforces company tenancy on findById", async () => {
    const venture = await ventures.create({
      companyId: harness.companyId,
      name: "Tenant Venture",
      ownerUserId: harness.userId,
      createdById: harness.userId,
    });

    await expect(ventures.findById("other-company", venture.id)).rejects.toBeInstanceOf(
      BosRepositoryError,
    );
  });

  it("rejects unknown status values at repository boundary", async () => {
    const venture = await ventures.create({
      companyId: harness.companyId,
      name: "Guard Venture",
      ownerUserId: harness.userId,
      createdById: harness.userId,
    });

    await expect(
      ventures.updateStatus(
        harness.companyId,
        venture.id,
        "not-a-real-status" as typeof VENTURE_STATUS.ACTIVE,
        harness.userId,
      ),
    ).rejects.toBeInstanceOf(BosRepositoryError);
  });
});
