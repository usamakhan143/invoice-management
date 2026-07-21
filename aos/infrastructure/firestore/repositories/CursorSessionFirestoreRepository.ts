import type firebase from "firebase/compat/app";
import type {
  CreateCursorSessionCommand,
  CursorSessionRepository,
  FinalizeCursorSessionCommand,
  UpdateCursorCaptureCommand,
} from "../../../contracts/CursorSessionRepository";
import type { CursorSession } from "../../../domain/cursor/entities/cursorSession";
import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import {
  cursorSessionFromFirestore,
  cursorSessionToFirestore,
  isCursorSessionFinalizedStatus,
} from "../models/cursorSessionDocument";

export class CursorSessionFirestoreRepository implements CursorSessionRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.CURSOR_SESSIONS);
  }

  async create(command: CreateCursorSessionCommand): Promise<CursorSession> {
    return runAosFirestoreOperation("CursorSession.create", async () => {
      assertCompanyMatch(command.companyId, command.session.companyId, "CursorSession");
      const ref = this.collection().doc(command.session.id);
      if ((await ref.get()).exists) {
        throw new AosRepositoryError(`CursorSession ${command.session.id} already exists`, "VERSION_CONFLICT");
      }
      await ref.set(cursorSessionToFirestore(command.session));
      const saved = cursorSessionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("CursorSession create failed");
      return saved;
    });
  }

  async updateCapture(command: UpdateCursorCaptureCommand): Promise<CursorSession> {
    return runAosFirestoreOperation("CursorSession.updateCapture", async () => {
      const ref = this.collection().doc(command.sessionId);
      const snap = await ref.get();
      if (!snap.exists) throw new AosRepositoryError("CursorSession not found", "AOS_NOT_FOUND");
      const current = cursorSessionFromFirestore(snap.id, snap.data());
      if (!current) throw new AosRepositoryError("Invalid CursorSession document", "AOS_INVALID_DOC");
      assertCompanyMatch(command.companyId, current.companyId, "CursorSession");
      if (isCursorSessionFinalizedStatus(current.status)) {
        throw new AosRepositoryError("Finalized CursorSession cannot be updated", "AOS_UPDATE_FAILED");
      }
      const updated: CursorSession = {
        ...current,
        captureSummary: command.captureSummary,
        capturedAt: command.capturedAt,
        status: "captured",
      };
      await ref.set(cursorSessionToFirestore(updated), { merge: true });
      const saved = cursorSessionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("CursorSession updateCapture failed");
      return saved;
    });
  }

  async finalize(command: FinalizeCursorSessionCommand): Promise<Readonly<CursorSession>> {
    return runAosFirestoreOperation("CursorSession.finalize", async () => {
      const ref = this.collection().doc(command.sessionId);
      const snap = await ref.get();
      if (!snap.exists) throw new AosRepositoryError("CursorSession not found", "AOS_NOT_FOUND");
      const current = cursorSessionFromFirestore(snap.id, snap.data());
      if (!current) throw new AosRepositoryError("Invalid CursorSession document", "AOS_INVALID_DOC");
      assertCompanyMatch(command.companyId, current.companyId, "CursorSession");
      if (isCursorSessionFinalizedStatus(current.status)) {
        throw new AosRepositoryError("CursorSession already finalized", "AOS_UPDATE_FAILED");
      }
      const finalized: CursorSession = {
        ...current,
        status: command.status,
        finalizedAt: command.finalizedAt,
      };
      await ref.set(cursorSessionToFirestore(finalized), { merge: true });
      const saved = cursorSessionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("CursorSession finalize failed");
      return Object.freeze(saved);
    });
  }

  async getById(companyId: CompanyId, sessionId: string): Promise<CursorSession | null> {
    return runAosFirestoreOperation("CursorSession.getById", async () => {
      const snap = await this.collection().doc(sessionId).get();
      if (!snap.exists) return null;
      const session = cursorSessionFromFirestore(snap.id, snap.data());
      if (!session) return null;
      assertCompanyMatch(companyId, session.companyId, "CursorSession");
      return session;
    });
  }

  async listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly CursorSession[]> {
    return runAosFirestoreOperation("CursorSession.listByEngagement", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("engagementId", "==", engagementId)
        .get();
      return snap.docs
        .map((doc) => cursorSessionFromFirestore(doc.id, doc.data()))
        .filter((s): s is CursorSession => s !== null)
        .sort((a, b) => b.startedAt - a.startedAt);
    });
  }
}
