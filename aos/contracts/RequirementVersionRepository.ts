import type { RequirementVersion } from "../domain/requirements/entities/requirementVersion";
import type { CompanyId } from "../types";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

export interface PublishRequirementVersionCommand {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  requirementSetId: string;
  version: RequirementVersion;
}

export interface RequirementVersionRepository {
  publish(command: PublishRequirementVersionCommand): Promise<RequirementVersion>;
  getById(companyId: CompanyId, versionId: string): Promise<RequirementVersion | null>;
  listBySet(
    companyId: CompanyId,
    requirementSetId: string,
  ): Promise<readonly RequirementVersion[]>;
  listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly RequirementVersion[]>;
  getLatestApproved(
    companyId: CompanyId,
    requirementSetId: string,
  ): Promise<RequirementVersion | null>;
}

export const REQUIREMENT_VERSION_REPOSITORY = Symbol("RequirementVersionRepository");
