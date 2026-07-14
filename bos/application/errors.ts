import type { DomainError } from "../domain/errors";

export class BosApplicationError extends Error {
  readonly code: string;
  readonly domainErrors?: DomainError[];

  constructor(message: string, code = "BOS_APPLICATION_ERROR", domainErrors?: DomainError[]) {
    super(message);
    this.name = "BosApplicationError";
    this.code = code;
    this.domainErrors = domainErrors;
  }
}

export function mapRepositoryError(error: unknown): never {
  if (error instanceof BosApplicationError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new BosApplicationError(error.message, "BOS_REPOSITORY_ERROR");
  }
  throw new BosApplicationError("Unknown BOS error", "BOS_UNKNOWN");
}
