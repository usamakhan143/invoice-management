export type AosRepositoryErrorCode =
  | "AOS_REPOSITORY_ERROR"
  | "AOS_NOT_FOUND"
  | "AOS_CREATE_FAILED"
  | "AOS_UPDATE_FAILED"
  | "AOS_SAVE_FAILED"
  | "AOS_INVALID_DOC"
  | "AOS_COMPANY_MISMATCH"
  | "VERSION_CONFLICT";

export class AosRepositoryError extends Error {
  readonly code: AosRepositoryErrorCode;

  constructor(message: string, code: AosRepositoryErrorCode = "AOS_REPOSITORY_ERROR") {
    super(message);
    this.name = "AosRepositoryError";
    this.code = code;
  }
}

export function normalizePageLimit(limit?: number): number {
  if (limit === undefined || limit <= 0) return 25;
  return Math.min(limit, 100);
}

export function assertCompanyMatch(
  expectedCompanyId: string,
  docCompanyId: string,
  entityLabel: string,
): void {
  if (expectedCompanyId !== docCompanyId) {
    throw new AosRepositoryError(`${entityLabel} companyId mismatch`, "AOS_COMPANY_MISMATCH");
  }
}

interface FirebaseLikeError {
  code?: string;
  message?: string;
}

/** Maps Firestore/Firebase failures to repository errors — never leak Firebase types upward. */
export function mapFirestoreError(error: unknown, context: string): AosRepositoryError {
  if (error instanceof AosRepositoryError) {
    return error;
  }

  if (error instanceof Error) {
    const firebaseError = error as FirebaseLikeError;
    const codeSuffix = firebaseError.code ? ` (${firebaseError.code})` : "";
    return new AosRepositoryError(`${context}: ${error.message}${codeSuffix}`, "AOS_REPOSITORY_ERROR");
  }

  return new AosRepositoryError(`${context}: Unknown Firestore error`, "AOS_REPOSITORY_ERROR");
}

export async function runAosFirestoreOperation<T>(
  context: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapFirestoreError(error, context);
  }
}
