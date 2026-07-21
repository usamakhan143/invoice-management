import type { PromptVersion } from "../domain/prompt/entities/promptVersion";
import type { CompanyId } from "../types";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

export interface PublishPromptVersionCommand {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  promptPackId: string;
  promptArtifactId: string;
  version: PromptVersion;
}

export interface PromptVersionRepository {
  publish(command: PublishPromptVersionCommand): Promise<PromptVersion>;
  getById(companyId: CompanyId, versionId: string): Promise<PromptVersion | null>;
  listByArtifact(
    companyId: CompanyId,
    promptArtifactId: string,
  ): Promise<readonly PromptVersion[]>;
  getLatestApproved(
    companyId: CompanyId,
    promptArtifactId: string,
  ): Promise<PromptVersion | null>;
}

export const PROMPT_VERSION_REPOSITORY = Symbol("PromptVersionRepository");
