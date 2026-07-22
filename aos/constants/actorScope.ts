import { AOS_PERMISSION_KEY } from "../constants/permissionKeys";
import type { AosActorScope } from "../application/types";

/** All canonical AOS permission keys — used for integration/E2E owner actors. */
export const ALL_AOS_PERMISSION_KEYS: readonly string[] = Object.values(AOS_PERMISSION_KEY);

export function createOwnerActorScope(companyId: string, actorUserId: string): AosActorScope {
  return {
    companyId,
    actorUserId,
    permissions: ALL_AOS_PERMISSION_KEYS,
    isOwner: true,
  };
}

export function createActorScopeWithPermissions(
  companyId: string,
  actorUserId: string,
  permissions: readonly string[],
): AosActorScope {
  return {
    companyId,
    actorUserId,
    permissions,
  };
}
