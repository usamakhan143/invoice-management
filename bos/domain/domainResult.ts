import type { DomainError } from "../errors";

export interface DomainValidationResult {
  ok: true;
}

export interface DomainValidationFailure {
  ok: false;
  errors: DomainError[];
}

export type DomainResult = DomainValidationResult | DomainValidationFailure;

export function domainOk(): DomainValidationResult {
  return { ok: true };
}

export function domainFail(errors: DomainError[]): DomainValidationFailure {
  return { ok: false, errors };
}

export function domainFailOne(code: DomainError["code"], message: string): DomainValidationFailure {
  return domainFail([{ code, message }]);
}
