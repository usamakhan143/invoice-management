import type { PlaybookEntry } from "../domain/catalog/entities/playbookEntry";
import type { CompanyReadScope } from "./readScope";

export interface PlaybookRepository {
  ensureSeeded(scope: CompanyReadScope): Promise<void>;
  listAll(scope: CompanyReadScope): Promise<readonly PlaybookEntry[]>;
  findById(scope: CompanyReadScope, entryId: string): Promise<PlaybookEntry | null>;
}
