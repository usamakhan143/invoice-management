import type { CursorSession } from "../domain/cursor/entities/cursorSession";
import type { CompanyId } from "../types";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

export interface CreateCursorSessionCommand {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  session: CursorSession;
}

export interface UpdateCursorCaptureCommand {
  companyId: CompanyId;
  sessionId: string;
  captureSummary: string;
  capturedAt: number;
}

export interface FinalizeCursorSessionCommand {
  companyId: CompanyId;
  sessionId: string;
  status: "passed" | "failed" | "submitted";
  finalizedAt: number;
}

export interface CursorSessionRepository {
  create(command: CreateCursorSessionCommand): Promise<CursorSession>;
  updateCapture(command: UpdateCursorCaptureCommand): Promise<CursorSession>;
  finalize(command: FinalizeCursorSessionCommand): Promise<Readonly<CursorSession>>;
  getById(companyId: CompanyId, sessionId: string): Promise<CursorSession | null>;
  listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly CursorSession[]>;
}

export const CURSOR_SESSION_REPOSITORY = Symbol("CursorSessionRepository");
