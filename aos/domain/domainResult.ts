import type { DeliveryDomainErrorCode } from "./delivery/errors";

export interface DomainValidationResult {
  ok: true;
}

export interface DomainValidationFailure {
  ok: false;
  errors: Array<{ code: DeliveryDomainErrorCode; message: string }>;
}

export type DomainResult = DomainValidationResult | DomainValidationFailure;

export function domainOk(): DomainValidationResult {
  return { ok: true };
}

export function domainFail(
  errors: Array<{ code: DeliveryDomainErrorCode; message: string }>,
): DomainValidationFailure {
  return { ok: false, errors };
}

export function domainFailOne(
  code: DeliveryDomainErrorCode,
  message: string,
): DomainValidationFailure {
  return domainFail([{ code, message }]);
}
