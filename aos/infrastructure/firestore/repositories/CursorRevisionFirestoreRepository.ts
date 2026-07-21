import type firebase from "firebase/compat/app";
import type {
  CreateCursorRevisionCommand,
  CursorRevisionRepository,
  ResolveCursorRevisionCommand,
} from "../../../contracts/CursorRevisionRepository";
import type { CursorRevision } from "../../../domain/cursor/entities/cursorRevision";
import type { CompanyId } from "../../../types";
import { AOS_COLLECTIONS } from "../collections";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import {
  cursorRevisionFromFirestore,
  cursorRevisionToFirestore,
} from "../models/cursorRevisionDocument";

export class CursorRevisionFirestoreRepository implements CursorRevisionRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.CURSOR_REVISIONS);
  }

  async create(command: CreateCursorRevisionCommand): Promise<CursorRevision> {
    return runAosFirestoreOperation("CursorRevision.create", async () => {
      assertCompanyMatch(command.companyId, command.revision.companyId, "CursorRevision");
      const ref = this.collection().doc(command.revision.id);
      if ((await ref.get()).exists) {
        throw new AosRepositoryError(`CursorRevision ${command.revision.id} already exists`, "VERSION_CONFLICT");
      }
      await ref.set(cursorRevisionToFirestore(command.revision));
      const saved = cursorRevisionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("CursorRevision create failed");
      return saved;
    });
  }

  async resolve(command: ResolveCursorRevisionCommand): Promise<CursorRevision> {
    return runAosFirestoreOperation("CursorRevision.resolve", async () => {
      const ref = this.collection().doc(command.revisionId);
      const snap = await ref.get();
      if (!snap.exists) throw new AosRepositoryError("CursorRevision not found", "AOS_NOT_FOUND");
      const current = cursorRevisionFromFirestore(snap.id, snap.data());
      if (!current) throw new AosRepositoryError("Invalid CursorRevision document", "AOS_INVALID_DOC");
      assertCompanyMatch(command.companyId, current.companyId, "CursorRevision");
      if (current.status !== "open") {
        throw new AosRepositoryError("CursorRevision is not open", "AOS_UPDATE_FAILED");
      }
      const resolved: CursorRevision = {
        ...current,
        revisionPromptVersionId: command.revisionPromptVersionId,
        status: "resolved",
        resolvedAt: command.resolvedAt,
      };
      await ref.set(cursorRevisionToFirestore(resolved), { merge: true });
      const saved = cursorRevisionFromFirestore(ref.id, (await ref.get()).data());
      if (!saved) throw new Error("CursorRevision resolve failed");
      return saved;
    });
  }

  async listBySession(
    companyId: CompanyId,
    cursorSessionId: string,
  ): Promise<readonly CursorRevision[]> {
    return runAosFirestoreOperation("CursorRevision.listBySession", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("cursorSessionId", "==", cursorSessionId)
        .get();
      return snap.docs
        .map((doc) => cursorRevisionFromFirestore(doc.id, doc.data()))
        .filter((r): r is CursorRevision => r !== null)
        .sort((a, b) => a.createdAt - b.createdAt);
    });
  }
}
