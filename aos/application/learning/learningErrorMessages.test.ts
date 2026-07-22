import { describe, expect, it } from "vitest";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import { mapLearningErrorMessage } from "./learningErrorMessages";

describe("mapLearningErrorMessage", () => {
  it("maps version conflict to refresh guidance", () => {
    expect(
      mapLearningErrorMessage(new AosRepositoryError("conflict", "VERSION_CONFLICT")),
    ).toContain("changed since you opened it");
  });

  it("maps gate failures without exposing internal codes", () => {
    expect(mapLearningErrorMessage(new Error("GK-005 blocked promotion"))).toContain(
      "quality gates",
    );
  });

  it("maps permission errors", () => {
    expect(mapLearningErrorMessage(new Error("permission denied"))).toContain(
      "do not have permission",
    );
  });
});
