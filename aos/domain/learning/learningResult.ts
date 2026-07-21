import type { LearningDomainError, LearningDomainErrorCode } from "./errors";

export interface LearningSuccess<T> {
  ok: true;
  value: T;
}

export interface LearningFailure {
  ok: false;
  errors: LearningDomainError[];
}

export type LearningResult<T> = LearningSuccess<T> | LearningFailure;

export function learningOk<T>(value: T): LearningSuccess<T> {
  return { ok: true, value };
}

export function learningFail(errors: LearningDomainError[]): LearningFailure {
  return { ok: false, errors };
}

export function learningFailOne(
  code: LearningDomainErrorCode,
  message: string,
): LearningFailure {
  return learningFail([{ code, message }]);
}
