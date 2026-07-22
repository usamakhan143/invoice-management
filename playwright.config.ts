import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "aos/e2e/playwright",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./scripts/aos-e2e-global-setup.ts",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_FIREBASE_USE_EMULATOR: "true",
      VITE_FIREBASE_EMULATOR_HOST: "127.0.0.1",
      VITE_FIRESTORE_EMULATOR_PORT: "8080",
      VITE_FIREBASE_AUTH_EMULATOR_PORT: "9099",
      VITE_FIREBASE_API_KEY: "fake-api-key-for-emulator",
      VITE_FIREBASE_AUTH_DOMAIN: "aos-integration-test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "aos-integration-test",
      VITE_FIREBASE_STORAGE_BUCKET: "aos-integration-test.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
      VITE_FIREBASE_APP_ID: "1:1234567890:web:aos-e2e",
      VITE_AOS_LEARNING_ENGINE: "true",
    },
  },
});
