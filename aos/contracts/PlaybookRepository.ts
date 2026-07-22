import type { CompanyId } from "../types";
import type { PlaybookEntry } from "../domain/catalog/entities/playbookEntry";

export interface PublishPlaybookFromPromotionCommand {
  companyId: CompanyId;
  entry: PlaybookEntry;
  markStaleEntryId?: string;
}

export interface PlaybookRepository {
  ensureSeeded(scope: import("./readScope").CompanyReadScope): Promise<void>;
  listAll(scope: import("./readScope").CompanyReadScope): Promise<readonly PlaybookEntry[]>;
  findById(
    scope: import("./readScope").CompanyReadScope,
    entryId: string,
  ): Promise<PlaybookEntry | null>;
  publishFromPromotion(
    command: PublishPlaybookFromPromotionCommand,
  ): Promise<PlaybookEntry>;
}
