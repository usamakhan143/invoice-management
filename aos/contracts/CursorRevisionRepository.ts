import type { CursorRevision } from "../domain/cursor/entities/cursorRevision";
import type { CompanyId } from "../types";

export interface CreateCursorRevisionCommand {
  companyId: CompanyId;
  revision: CursorRevision;
}

export interface ResolveCursorRevisionCommand {
  companyId: CompanyId;
  revisionId: string;
  revisionPromptVersionId: string;
  resolvedAt: number;
}

export interface CursorRevisionRepository {
  create(command: CreateCursorRevisionCommand): Promise<CursorRevision>;
  resolve(command: ResolveCursorRevisionCommand): Promise<CursorRevision>;
  listBySession(companyId: CompanyId, cursorSessionId: string): Promise<readonly CursorRevision[]>;
}

export const CURSOR_REVISION_REPOSITORY = Symbol("CursorRevisionRepository");
