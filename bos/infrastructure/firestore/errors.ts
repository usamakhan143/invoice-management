import type { DomainError } from "../../../domain/errors";
import type { DomainResult } from "../../../domain/domainResult";

export class BosRepositoryError extends Error {
  readonly code: string;
  readonly domainErrors?: DomainError[];

  constructor(message: string, code = "BOS_REPOSITORY_ERROR", domainErrors?: DomainError[]) {
    super(message);
    this.name = "BosRepositoryError";
    this.code = code;
    this.domainErrors = domainErrors;
  }
}

export function assertDomainOk(result: DomainResult, fallbackMessage: string): void {
  if (result.ok) return;
  const message = result.errors.map((e) => e.message).join("; ") || fallbackMessage;
  throw new BosRepositoryError(message, "BOS_DOMAIN_VALIDATION", result.errors);
}

export function normalizePageLimit(limit?: number): number {
  if (limit === undefined || limit <= 0) return 25;
  return Math.min(limit, 100);
}
