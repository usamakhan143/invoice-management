import type { RequirementVersionRepository } from "../../contracts/RequirementVersionRepository";
import type { PromptVersionRepository } from "../../contracts/PromptVersionRepository";
import type { AuditEventRepository } from "../../contracts/EngagementWorkflowRepository";
import type { EngagementWorkflowRepository } from "../../contracts/EngagementWorkflowRepository";
import type { RequirementVersion } from "../../domain/requirements/entities/requirementVersion";
import { createPromptVersion } from "../../domain/prompt/entities/promptVersion";
import type { EngagementWorkflow } from "../../domain/workflow/entities/engagementWorkflow";
import { withRecomputedGates } from "../../domain/workflow/entities/engagementWorkflow";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { CompanyId, EpochMs, UserId } from "../../types";
import {
  requirementVersionDocId,
  promptVersionDocId,
  createRandomVersionChainId,
} from "../../infrastructure/firestore/versionIds";
import { createAuditEvent } from "../../domain/audit/rules/auditEventRules";
import { createRequirementVersion } from "../../domain/requirements/entities/requirementVersion";

export interface LegacyVersionMigrationDeps {
  workflows: EngagementWorkflowRepository;
  requirementVersions: RequirementVersionRepository;
  auditEvents: AuditEventRepository;
}

/**
 * Lazy materializes v1 immutable versions from legacy D4 embedded approved heads.
 * Idempotent — skips when pointer or version doc already exists.
 */
export class LegacyVersionMigrationService {
  constructor(private readonly deps: LegacyVersionMigrationDeps) {}

  async ensureRequirementVersionMaterialized(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    actorUserId: UserId;
    occurredAt: EpochMs;
  }): Promise<EngagementWorkflow> {
    const { workflow, companyId, engagementId } = input;
    const set = workflow.requirementSet;
    if (!set || set.status !== "approved") {
      return workflow;
    }
    if (set.currentApprovedVersionId) {
      const existing = await this.deps.requirementVersions.getById(
        companyId,
        set.currentApprovedVersionId,
      );
      if (existing) return workflow;
    }

    const versionId = requirementVersionDocId(companyId, set.id, 1);
    const existingDoc = await this.deps.requirementVersions.getById(companyId, versionId);
    if (existingDoc) {
      const patched = withRecomputedGates({
        ...workflow,
        requirementSet: {
          ...set,
          currentApprovedVersionId: existingDoc.id,
          currentApprovedVersionNumber: existingDoc.versionNumber,
          version: existingDoc.versionNumber,
        },
        currentApprovedRequirementVersionId: existingDoc.id,
        currentApprovedRequirementVersionNumber: existingDoc.versionNumber,
      });
      await this.deps.workflows.save(companyId, patched);
      return patched;
    }

    const version: RequirementVersion = createRequirementVersion({
      id: versionId,
      companyId,
      engagementId,
      requirementSetId: set.id,
      versionNumber: 1,
      publishedAt: set.approvedAt ?? input.occurredAt,
      publishedByUserId: input.actorUserId,
      snapshot: {
        title: set.title,
        items: set.items.map((item) => ({ ...item })),
      },
    });

    await this.deps.requirementVersions.publish({
      companyId,
      engagementId,
      requirementSetId: set.id,
      version,
    });

    const auditResult = createAuditEvent(
      {
        companyId,
        engagementId,
        type: "aos_version_migration_materialized",
        title: "Legacy requirement version materialized",
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        artifactType: "requirement_version",
        versionId: version.id,
        versionNumber: 1,
        source: "d4_embedded_migration",
      },
      createRandomVersionChainId(`migration-req-${input.occurredAt}`),
    );
    if (auditResult.ok) {
      await this.deps.auditEvents.append(auditResult.value);
    }

    const patched = withRecomputedGates({
      ...workflow,
      requirementSet: {
        ...set,
        currentApprovedVersionId: version.id,
        currentApprovedVersionNumber: 1,
        version: 1,
      },
      currentApprovedRequirementVersionId: version.id,
      currentApprovedRequirementVersionNumber: 1,
    });
    await this.deps.workflows.save(companyId, patched);
    return patched;
  }
}

export interface LegacyPromptMigrationDeps {
  workflows: EngagementWorkflowRepository;
  requirementVersions: RequirementVersionRepository;
  promptVersions: PromptVersionRepository;
  auditEvents: AuditEventRepository;
}

export class LegacyPromptMigrationService {
  constructor(private readonly deps: LegacyPromptMigrationDeps) {}

  async ensurePromptVersionsMaterialized(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    requirementVersion: RequirementVersion;
    actorUserId: UserId;
    occurredAt: EpochMs;
  }): Promise<EngagementWorkflow> {
    const { workflow, companyId } = input;
    const pack = workflow.promptPack;
    if (!pack || pack.status !== "approved") {
      return workflow;
    }

    let updatedPack = pack;
    let changed = false;

    for (const artifact of pack.artifacts) {
      if (artifact.currentApprovedVersionId) {
        const existing = await this.deps.promptVersions.getById(
          companyId,
          artifact.currentApprovedVersionId,
        );
        if (existing) continue;
      }

      const versionId = promptVersionDocId(companyId, artifact.id, 1);
      const existingDoc = await this.deps.promptVersions.getById(companyId, versionId);
      if (existingDoc) {
        updatedPack = {
          ...updatedPack,
          requirementVersionId: input.requirementVersion.id,
          artifacts: updatedPack.artifacts.map((a) =>
            a.id === artifact.id
              ? {
                  ...a,
                  currentApprovedVersionId: existingDoc.id,
                  currentApprovedVersionNumber: 1,
                }
              : a,
          ),
        };
        changed = true;
        continue;
      }

      const version = createPromptVersion({
        id: versionId,
        companyId,
        engagementId: input.engagementId,
        promptPackId: pack.id,
        promptArtifactId: artifact.id,
        requirementVersionId: input.requirementVersion.id,
        versionNumber: 1,
        publishedAt: pack.approvedAt ?? input.occurredAt,
        publishedByUserId: input.actorUserId,
        snapshot: { title: artifact.title, body: artifact.body },
      });

      await this.deps.promptVersions.publish({
        companyId,
        engagementId: input.engagementId,
        promptPackId: pack.id,
        promptArtifactId: artifact.id,
        version,
      });

      updatedPack = {
        ...updatedPack,
        requirementVersionId: input.requirementVersion.id,
        artifacts: updatedPack.artifacts.map((a) =>
          a.id === artifact.id
            ? { ...a, currentApprovedVersionId: version.id, currentApprovedVersionNumber: 1 }
            : a,
        ),
      };
      changed = true;

      const auditResult = createAuditEvent(
        {
          companyId,
          engagementId: input.engagementId,
          type: "aos_version_migration_materialized",
          title: "Legacy prompt version materialized",
          actorUserId: input.actorUserId,
          occurredAt: input.occurredAt,
          artifactType: "prompt_version",
          versionId: version.id,
          versionNumber: 1,
          source: "d4_embedded_migration",
        },
        createRandomVersionChainId(`migration-prompt-${artifact.id}-${input.occurredAt}`),
      );
      if (auditResult.ok) {
        await this.deps.auditEvents.append(auditResult.value);
      }
    }

    if (!changed) return workflow;
    const patched = withRecomputedGates({ ...workflow, promptPack: updatedPack });
    await this.deps.workflows.save(companyId, patched);
    return patched;
  }
}
