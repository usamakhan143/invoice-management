import type firebase from "firebase/compat/app";
import type { PaginatedResult, PaginationQuery } from "../../../types";
import { normalizePageLimit } from "./errors";

export async function runPaginatedQuery<T>(
  buildQuery: (
    base: firebase.firestore.Query,
  ) => firebase.firestore.Query,
  mapDoc: (doc: firebase.firestore.QueryDocumentSnapshot) => T,
  collectionRef: firebase.firestore.CollectionReference,
  query?: PaginationQuery,
): Promise<PaginatedResult<T>> {
  const limit = normalizePageLimit(query?.limit);
  let q = buildQuery(collectionRef).orderBy("updatedAt", "desc").limit(limit + 1);

  if (query?.cursor) {
    const cursorSnap = await collectionRef.doc(query.cursor).get();
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;
  const items = pageDocs.map(mapDoc);

  return {
    items,
    nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id : undefined,
  };
}

/** Decisions list by createdAt desc. */
export async function runPaginatedQueryByCreatedAt<T>(
  buildQuery: (
    base: firebase.firestore.Query,
  ) => firebase.firestore.Query,
  mapDoc: (doc: firebase.firestore.QueryDocumentSnapshot) => T,
  collectionRef: firebase.firestore.CollectionReference,
  query?: PaginationQuery,
): Promise<PaginatedResult<T>> {
  const limit = normalizePageLimit(query?.limit);
  let q = buildQuery(collectionRef).orderBy("createdAt", "desc").limit(limit + 1);

  if (query?.cursor) {
    const cursorSnap = await collectionRef.doc(query.cursor).get();
    if (cursorSnap.exists) {
      q = q.startAfter(cursorSnap);
    }
  }

  const snap = await q.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const pageDocs = hasMore ? docs.slice(0, limit) : docs;

  return {
    items: pageDocs.map(mapDoc),
    nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id : undefined,
  };
}

export function assertCompanyMatch(
  expectedCompanyId: string,
  docCompanyId: string,
  entityLabel: string,
): void {
  if (expectedCompanyId !== docCompanyId) {
    throw new Error(`${entityLabel} companyId mismatch`);
  }
}
