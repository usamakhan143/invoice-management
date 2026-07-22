import { AOS_PERMISSION_KEY, type AosPermissionKey } from "../../constants/permissionKeys";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import type { AosActorScope } from "../types";

export type AosPermissionRequirement = AosPermissionKey | readonly AosPermissionKey[];

function hasAnyPermission(scope: AosActorScope, keys: readonly string[]): boolean {
  if (scope.isOwner) return true;
  if (scope.permissions.includes(AOS_PERMISSION_KEY.ADMIN)) return true;
  return keys.some((key) => scope.permissions.includes(key));
}

/** Defense-in-depth authorization — complements UI gates and Firestore rules. */
export function assertAosPermission(
  scope: AosActorScope,
  requirement: AosPermissionRequirement,
): void {
  const keys = Array.isArray(requirement) ? requirement : [requirement];
  if (hasAnyPermission(scope, keys)) return;
  throw new AosRepositoryError(
    `Permission denied: requires ${keys.join(" or ")}`,
    "AOS_UPDATE_FAILED",
  );
}

export const LEARNING_VIEW_PERMISSION: readonly AosPermissionKey[] = [
  AOS_PERMISSION_KEY.LEARNING_VIEW,
  AOS_PERMISSION_KEY.ADMIN,
];

export const LEARNING_REVIEW_PERMISSION: readonly AosPermissionKey[] = [
  AOS_PERMISSION_KEY.LEARNING_REVIEW,
  AOS_PERMISSION_KEY.ADMIN,
];

export const LEARNING_PROMOTE_PERMISSION: readonly AosPermissionKey[] = [
  AOS_PERMISSION_KEY.LEARNING_PROMOTE,
  AOS_PERMISSION_KEY.ADMIN,
];
