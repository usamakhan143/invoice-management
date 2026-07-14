import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["bos/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
