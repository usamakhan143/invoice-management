export type VersionDomainErrorCode =
  | "VERSION_IMMUTABLE"
  | "VERSION_DUPLICATE_NUMBER"
  | "VERSION_DRAFT_MUTATION_FORBIDDEN"
  | "VERSION_INVALID_STATUS"
  | "VERSION_REF_MISMATCH"
  | "VERSION_COMPANY_MISMATCH"
  | "VERSION_MISSING_REF"
  | "VERSION_NOT_FOUND"
  | "VERSION_ALREADY_FINALIZED"
  | "VERSION_MONOTONIC_VIOLATION"
  | "VERSION_CROSS_ARTIFACT_MISMATCH"
  | "VERSION_CONFLICT";

export interface VersionDomainError {
  code: VersionDomainErrorCode;
  message: string;
}

export interface VersionSuccess<T> {
  ok: true;
  value: T;
}

export interface VersionFailure {
  ok: false;
  errors: VersionDomainError[];
}

export type VersionResult<T> = VersionSuccess<T> | VersionFailure;

export function versionOk<T>(value: T): VersionSuccess<T> {
  return { ok: true, value };
}

export function versionFail(errors: VersionDomainError[]): VersionFailure {
  return { ok: false, errors };
}

export function versionFailOne(
  code: VersionDomainErrorCode,
  message: string,
): VersionFailure {
  return versionFail([{ code, message }]);
}

/** Deep-freeze published immutable records at domain boundary. */
export function freezePublishedRecord<T extends object>(value: T): Readonly<T> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          return [key, freezePublishedRecord(val as object)];
        }
        if (Array.isArray(val)) {
          return [key, Object.freeze(val.map((item) => (item && typeof item === "object" ? freezePublishedRecord(item as object) : item)))];
        }
        return [key, val];
      }),
    ),
  ) as Readonly<T>;
}

export function assertSameCompany(
  expected: string,
  actual: string,
  label: string,
): VersionResult<void> {
  if (expected !== actual) {
    return versionFailOne("VERSION_COMPANY_MISMATCH", `${label}: companyId mismatch`);
  }
  return versionOk(undefined);
}

export function assertMonotonicVersionNumber(
  existingVersionNumbers: readonly number[],
  nextVersionNumber: number,
): VersionResult<void> {
  if (existingVersionNumbers.includes(nextVersionNumber)) {
    return versionFailOne(
      "VERSION_DUPLICATE_NUMBER",
      `Version number ${nextVersionNumber} already exists`,
    );
  }
  const max = existingVersionNumbers.length > 0 ? Math.max(...existingVersionNumbers) : 0;
  if (nextVersionNumber !== max + 1) {
    return versionFailOne(
      "VERSION_MONOTONIC_VIOLATION",
      `Expected version ${max + 1}, got ${nextVersionNumber}`,
    );
  }
  return versionOk(undefined);
}
