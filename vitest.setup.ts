/** Vitest Node environment shims for Firebase compat client imports. */
if (typeof globalThis.window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: { hostname: "localhost", href: "http://localhost/" },
    },
    writable: true,
  });
}
