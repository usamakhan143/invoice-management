import type { DomainResult } from "../domain/domainResult";
import { BosApplicationError } from "./errors";

export function assertApplicationDomainOk(result: DomainResult, fallbackMessage: string): void {
  if (result.ok) return;
  const message = result.errors.map((e) => e.message).join("; ") || fallbackMessage;
  throw new BosApplicationError(message, "BOS_DOMAIN_VALIDATION", result.errors);
}
