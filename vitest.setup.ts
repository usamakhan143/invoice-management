import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

/** Vitest Node environment shims for Firebase compat client imports. */
if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: { hostname: "localhost", href: "http://localhost/" },
    },
    writable: true,
  });
}
