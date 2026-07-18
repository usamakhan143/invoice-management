import type { DeliveryEngagementRepository } from "../../contracts/DeliveryEngagementRepository";
import type { AosDeliveryReadPorts } from "../../integration/ports/deliveryReadPorts";
import type { DeliveryEngagement } from "../../domain/delivery/entities/deliveryEngagement";
import type { DeliveryEngagementTransitionEvent } from "../../domain/delivery/lifecycle/deliveryEngagementLifecycle";
import {
  cancelDeliveryEngagement,
  transitionDeliveryEngagement,
} from "../../domain/delivery/deliveryEngagementAggregate";
import {
  validateCreateDeliveryEngagement,
  validateInitiativeReference,
  validateLeadReference,
  validateUpdateDeliveryEngagement,
} from "../../domain/delivery/rules/deliveryEngagementRules";
import type { DeliveryEngagementArtifactRefs } from "../../domain/delivery/valueObjects";
import { EMPTY_DELIVERY_ARTIFACT_REFS } from "../../domain/delivery/valueObjects";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { AosActorScope, AosReadScope } from "../../types";
import type { AdvanceDeliveryLifecycleCommand } from "./commands/AdvanceDeliveryLifecycleCommand";
import type { CancelDeliveryEngagementCommand } from "./commands/CancelDeliveryEngagementCommand";
import type { CreateDeliveryEngagementCommand } from "./commands/CreateDeliveryEngagementCommand";
import type { LinkBosInitiativeCommand } from "./commands/LinkBosInitiativeCommand";
import type { PauseDeliveryEngagementCommand } from "./commands/PauseDeliveryEngagementCommand";
import type { ResumeDeliveryEngagementCommand } from "./commands/ResumeDeliveryEngagementCommand";
import type { UpdateDeliveryEngagementCommand } from "./commands/UpdateDeliveryEngagementCommand";
import {
  toDeliveryEngagementDto,
  toDeliveryEngagementListDto,
  type DeliveryEngagementDto,
  type DeliveryEngagementListDto,
} from "./dto/DeliveryEngagementDto";
import { AosDeliveryApplicationError, mapDeliveryRepositoryError } from "./errors";
import type { GetDeliveryEngagementQuery } from "./queries/GetDeliveryEngagementQuery";
import type { ListCompanyDeliveriesQuery } from "./queries/ListCompanyDeliveriesQuery";
import type { ListCustomerDeliveriesQuery } from "./queries/ListCustomerDeliveriesQuery";
import {
  type DeliveryTransactionLabel,
  type DeliveryUnitOfWork,
  passthroughDeliveryUnitOfWork,
} from "./transaction";
import { assertDeliveryDomainOk, assertDeliveryTransitionOk } from "./validation";

export interface DeliveryApplicationServiceDeps {
  engagements: DeliveryEngagementRepository;
  readPorts: AosDeliveryReadPorts;
  unitOfWork?: DeliveryUnitOfWork;
}

/**
 * Delivery application orchestration — coordinates domain, repositories, and read ports.
 * Business rules remain in the domain layer only.
 */
export class DeliveryApplicationService {
  private readonly engagements: DeliveryEngagementRepository;
  private readonly readPorts: AosDeliveryReadPorts;
  private readonly unitOfWork: DeliveryUnitOfWork;

  constructor(deps: DeliveryApplicationServiceDeps) {
    this.engagements = deps.engagements;
    this.readPorts = deps.readPorts;
    this.unitOfWork = deps.unitOfWork ?? passthroughDeliveryUnitOfWork;
  }

  async getEngagement(
    scope: AosReadScope,
    query: GetDeliveryEngagementQuery,
  ): Promise<DeliveryEngagementDto | null> {
    try {
      const engagement = await this.engagements.findById(scope.companyId, query.engagementId);
      return engagement ? toDeliveryEngagementDto(engagement) : null;
    } catch (error) {
      return mapDeliveryRepositoryError(error);
    }
  }

  async listCompanyDeliveries(
    scope: AosReadScope,
    query: ListCompanyDeliveriesQuery,
  ): Promise<DeliveryEngagementListDto> {
    try {
      const { status, ...pagination } = query;
      const result = await this.engagements.listByCompany(scope.companyId, {
        ...pagination,
        status,
      });
      return toDeliveryEngagementListDto(result.items, result.nextCursor);
    } catch (error) {
      return mapDeliveryRepositoryError(error);
    }
  }

  async listCustomerDeliveries(
    scope: AosReadScope,
    query: ListCustomerDeliveriesQuery,
  ): Promise<DeliveryEngagementListDto> {
    try {
      const { erpCustomerId, status, ...pagination } = query;
      const result = await this.engagements.listByCustomer(scope.companyId, erpCustomerId, {
        ...pagination,
        status,
      });
      return toDeliveryEngagementListDto(result.items, result.nextCursor);
    } catch (error) {
      return mapDeliveryRepositoryError(error);
    }
  }

  async createEngagement(
    scope: AosActorScope,
    command: CreateDeliveryEngagementCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.runTransactional("create_engagement", async () => {
      try {
        const customerRef = await this.requireCustomer(scope, command.erpCustomerId);
        const leadRef = await this.resolveLead(scope, command.erpLeadId);
        const initiativeRef = await this.resolveInitiative(scope, command.bosInitiativeId);
        const initiativeSummary = initiativeRef
          ? await this.readPorts.initiatives.getInitiativeSummary(
              scope.companyId,
              initiativeRef.initiativeId,
            )
          : null;

        await this.requireUser(scope, command.deliveryLeadUserId);
        if (command.teamMemberUserIds?.length) {
          await this.requireUsers(scope, command.teamMemberUserIds);
        }

        assertDeliveryDomainOk(
          validateCreateDeliveryEngagement(
            {
              companyId: scope.companyId,
              title: command.title,
              scopeSummary: command.scopeSummary,
              erpCustomerId: command.erpCustomerId,
              erpLeadId: command.erpLeadId,
              deliveryLeadUserId: command.deliveryLeadUserId,
              agencyType: command.agencyType,
              engagementType: command.engagementType,
              bosInitiativeId: command.bosInitiativeId,
              bosVentureId: initiativeSummary?.ventureId,
              deliveryTemplateId: command.deliveryTemplateId,
              teamMemberUserIds: command.teamMemberUserIds,
              createdById: scope.actorUserId,
            },
            {
              customer: customerRef,
              lead: leadRef,
              initiative: initiativeRef,
            },
          ),
          "Create delivery engagement rejected",
        );

        const created = await this.engagements.create({
          companyId: scope.companyId,
          title: command.title,
          scopeSummary: command.scopeSummary,
          erpCustomerId: command.erpCustomerId,
          erpLeadId: command.erpLeadId,
          deliveryLeadUserId: command.deliveryLeadUserId,
          agencyType: command.agencyType,
          engagementType: command.engagementType,
          bosInitiativeId: command.bosInitiativeId,
          bosVentureId: initiativeSummary?.ventureId,
          deliveryTemplateId: command.deliveryTemplateId,
          teamMemberUserIds: command.teamMemberUserIds,
          createdById: scope.actorUserId,
        });

        return toDeliveryEngagementDto(created);
      } catch (error) {
        return mapDeliveryRepositoryError(error);
      }
    });
  }

  async updateEngagement(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    command: UpdateDeliveryEngagementCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.runTransactional("update_engagement", async () => {
      try {
        const engagement = await this.requireEngagement(scope, engagementId);

        if (command.deliveryLeadUserId) {
          await this.requireUser(scope, command.deliveryLeadUserId);
        }
        if (command.teamMemberUserIds?.length) {
          await this.requireUsers(scope, command.teamMemberUserIds);
        }

        assertDeliveryDomainOk(
          validateUpdateDeliveryEngagement(engagement, {
            title: command.title,
            scopeSummary: command.scopeSummary,
            erpLeadId: command.erpLeadId,
            deliveryLeadUserId: command.deliveryLeadUserId,
            teamMemberUserIds: command.teamMemberUserIds,
            agencyType: command.agencyType,
            engagementType: command.engagementType,
            auditNote: command.auditNote,
            updatedById: scope.actorUserId,
          }),
          "Update delivery engagement rejected",
        );

        const updated = await this.engagements.update(scope.companyId, engagementId, {
          title: command.title,
          scopeSummary: command.scopeSummary,
          erpLeadId: command.erpLeadId,
          deliveryLeadUserId: command.deliveryLeadUserId,
          teamMemberUserIds: command.teamMemberUserIds,
          agencyType: command.agencyType,
          engagementType: command.engagementType,
          auditNote: command.auditNote,
          updatedById: scope.actorUserId,
        });

        return toDeliveryEngagementDto(updated);
      } catch (error) {
        return mapDeliveryRepositoryError(error);
      }
    });
  }

  async pauseEngagement(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    _command: PauseDeliveryEngagementCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.transitionEngagement(
      scope,
      engagementId,
      "pause_engagement",
      "pause",
      EMPTY_DELIVERY_ARTIFACT_REFS,
    );
  }

  async resumeEngagement(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    _command: ResumeDeliveryEngagementCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.transitionEngagement(
      scope,
      engagementId,
      "resume_engagement",
      "resume",
      EMPTY_DELIVERY_ARTIFACT_REFS,
    );
  }

  async cancelEngagement(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    command: CancelDeliveryEngagementCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.runTransactional("cancel_engagement", async () => {
      try {
        const engagement = await this.requireEngagement(scope, engagementId);

        const now = Date.now();
        const updated = assertDeliveryTransitionOk(
          cancelDeliveryEngagement(
            engagement,
            {
              cancelReason: command.cancelReason,
              cancelledById: scope.actorUserId,
            },
            now,
          ),
          "Cancel delivery engagement rejected",
        );

        const saved = await this.engagements.save(scope.companyId, updated);

        return toDeliveryEngagementDto(saved);
      } catch (error) {
        return mapDeliveryRepositoryError(error);
      }
    });
  }

  async advanceLifecycle(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    command: AdvanceDeliveryLifecycleCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.transitionEngagement(
      scope,
      engagementId,
      "lifecycle_transition",
      command.event,
      command.artifacts,
    );
  }

  async linkBosInitiative(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    command: LinkBosInitiativeCommand,
  ): Promise<DeliveryEngagementDto> {
    return this.runTransactional("link_initiative", async () => {
      try {
        const engagement = await this.requireEngagement(scope, engagementId);
        const initiativeRef =
          command.bosInitiativeId === null
            ? undefined
            : await this.requireInitiative(scope, command.bosInitiativeId);
        const initiativeSummary = initiativeRef
          ? await this.readPorts.initiatives.getInitiativeSummary(
              scope.companyId,
              initiativeRef.initiativeId,
            )
          : null;

        assertDeliveryDomainOk(
          validateInitiativeReference(scope.companyId, initiativeRef),
          "BOS initiative reference rejected",
        );

        assertDeliveryDomainOk(
          validateUpdateDeliveryEngagement(engagement, {
            bosInitiativeId: command.bosInitiativeId,
            bosVentureId: initiativeSummary?.ventureId ?? null,
            auditNote: command.auditNote,
            updatedById: scope.actorUserId,
          }),
          "Link BOS initiative rejected",
        );

        const updated = await this.engagements.update(scope.companyId, engagementId, {
          bosInitiativeId: command.bosInitiativeId,
          bosVentureId: initiativeSummary?.ventureId ?? null,
          auditNote: command.auditNote,
          updatedById: scope.actorUserId,
        });

        return toDeliveryEngagementDto(updated);
      } catch (error) {
        return mapDeliveryRepositoryError(error);
      }
    });
  }

  private async transitionEngagement(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    label: DeliveryTransactionLabel,
    event: DeliveryEngagementTransitionEvent,
    artifacts: DeliveryEngagementArtifactRefs,
  ): Promise<DeliveryEngagementDto> {
    return this.runTransactional(label, async () => {
      try {
        const engagement = await this.requireEngagement(scope, engagementId);

        const now = Date.now();
        const updated = assertDeliveryTransitionOk(
          transitionDeliveryEngagement(
            engagement,
            event,
            artifacts,
            scope.actorUserId,
            now,
          ),
          "Lifecycle transition rejected",
        );

        const saved = await this.engagements.save(scope.companyId, updated);
        return toDeliveryEngagementDto(saved);
      } catch (error) {
        return mapDeliveryRepositoryError(error);
      }
    });
  }

  private async requireEngagement(
    scope: AosReadScope,
    engagementId: DeliveryEngagementId,
  ): Promise<DeliveryEngagement> {
    const engagement = await this.engagements.findById(scope.companyId, engagementId);
    if (!engagement) {
      throw new AosDeliveryApplicationError(
        "Delivery engagement not found",
        "DELIVERY_NOT_FOUND",
      );
    }
    return engagement;
  }

  private async requireCustomer(scope: AosReadScope, customerId: string) {
    const exists = await this.readPorts.customers.customerExists(scope.companyId, customerId);
    if (!exists) {
      throw new AosDeliveryApplicationError("Customer not found", "CUSTOMER_NOT_FOUND");
    }
    return { customerId, companyId: scope.companyId };
  }

  private async resolveLead(scope: AosReadScope, leadId?: string) {
    if (!leadId) return undefined;
    const exists = await this.readPorts.leads.leadExists(scope.companyId, leadId);
    if (!exists) {
      throw new AosDeliveryApplicationError("Lead not found", "LEAD_NOT_FOUND");
    }
    const leadRef = { leadId, companyId: scope.companyId };
    assertDeliveryDomainOk(
      validateLeadReference(scope.companyId, leadRef),
      "Lead reference rejected",
    );
    return leadRef;
  }

  private async resolveInitiative(scope: AosReadScope, initiativeId?: string) {
    if (!initiativeId) return undefined;
    return this.requireInitiative(scope, initiativeId);
  }

  private async requireInitiative(scope: AosReadScope, initiativeId: string) {
    const exists = await this.readPorts.initiatives.initiativeExists(scope.companyId, initiativeId);
    if (!exists) {
      throw new AosDeliveryApplicationError("BOS initiative not found", "INITIATIVE_NOT_FOUND");
    }
    return { initiativeId, companyId: scope.companyId };
  }

  private async requireUser(scope: AosReadScope, userId: string) {
    const exists = await this.readPorts.users.userExists(scope.companyId, userId);
    if (!exists) {
      throw new AosDeliveryApplicationError("User not found", "USER_NOT_FOUND");
    }
  }

  private async requireUsers(scope: AosReadScope, userIds: string[]) {
    for (const userId of userIds) {
      await this.requireUser(scope, userId);
    }
  }

  private runTransactional<T>(
    label: DeliveryTransactionLabel,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.unitOfWork.run(label, work);
  }
}
