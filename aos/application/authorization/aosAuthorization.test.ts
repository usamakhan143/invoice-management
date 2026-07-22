import { describe, expect, it } from "vitest";
import { AOS_PERMISSION_KEY } from "../../constants/permissionKeys";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import type { AosActorScope } from "../types";
import {
  assertAosPermission,
  LEARNING_PROMOTE_PERMISSION,
  LEARNING_REVIEW_PERMISSION,
  LEARNING_VIEW_PERMISSION,
} from "./aosAuthorization";

function scope(permissions: string[]): AosActorScope {
  return {
    companyId: "co1",
    actorUserId: "user-1",
    permissions,
  };
}

describe("assertAosPermission", () => {
  it("allows owner without explicit permission keys", () => {
    expect(() =>
      assertAosPermission({ ...scope([]), isOwner: true }, LEARNING_REVIEW_PERMISSION),
    ).not.toThrow();
  });

  it("allows admin permission as fallback", () => {
    expect(() =>
      assertAosPermission(scope([AOS_PERMISSION_KEY.ADMIN]), LEARNING_PROMOTE_PERMISSION),
    ).not.toThrow();
  });

  it("denies missing learning review permission", () => {
    expect(() => assertAosPermission(scope([]), LEARNING_REVIEW_PERMISSION)).toThrow(
      AosRepositoryError,
    );
  });

  it("allows explicit learning view permission", () => {
    expect(() =>
      assertAosPermission(scope([AOS_PERMISSION_KEY.LEARNING_VIEW]), LEARNING_VIEW_PERMISSION),
    ).not.toThrow();
  });
});
