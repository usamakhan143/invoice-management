import type { DeliveryDomainErrorCode } from "../../domain/delivery/errors";

export type AosDeliveryApplicationErrorCode =
  | "DELIVERY_NOT_FOUND"
  | "CUSTOMER_NOT_FOUND"
  | "LEAD_NOT_FOUND"
  | "INITIATIVE_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "COMPANY_MISMATCH"
  | "AOS_DOMAIN_VALIDATION"
  | "AOS_REPOSITORY_ERROR"
  | "AOS_UNKNOWN";

export interface AosDeliveryApplicationErrorPayload {
  code: AosDeliveryApplicationErrorCode;
  message: string;
  domainErrors?: Array<{ code: DeliveryDomainErrorCode; message: string }>;
}

export class AosDeliveryApplicationError extends Error implements AosDeliveryApplicationErrorPayload {
  readonly code: AosDeliveryApplicationErrorCode;
  readonly domainErrors?: Array<{ code: DeliveryDomainErrorCode; message: string }>;

  constructor(
    message: string,
    code: AosDeliveryApplicationErrorCode = "AOS_UNKNOWN",
    domainErrors?: Array<{ code: DeliveryDomainErrorCode; message: string }>,
  ) {
    super(message);
    this.name = "AosDeliveryApplicationError";
    this.code = code;
    this.domainErrors = domainErrors;
  }
}

export function mapDeliveryRepositoryError(error: unknown): never {
  if (error instanceof AosDeliveryApplicationError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new AosDeliveryApplicationError(error.message, "AOS_REPOSITORY_ERROR");
  }
  throw new AosDeliveryApplicationError("Unknown delivery application error", "AOS_UNKNOWN");
}
