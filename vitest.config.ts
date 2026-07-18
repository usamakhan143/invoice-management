import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["bos/**/*.test.{ts,tsx}", "aos/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    environmentMatchGlobs: [["aos/presentation/**", "jsdom"]],
  },
});
