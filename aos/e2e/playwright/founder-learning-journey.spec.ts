import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

interface E2EState {
  authToken: string;
  companyId: string;
  userId: string;
  engagementId: string;
  candidateId: string;
}

function loadState(): E2EState {
  const raw = readFileSync(resolve(process.cwd(), ".aos-e2e/state.json"), "utf8");
  return JSON.parse(raw) as E2EState;
}

function hashPath(path: string): string {
  return path.startsWith("/") ? `/#${path}` : `/#/${path}`;
}

async function signIn(page: import("@playwright/test").Page, token: string) {
  await page.goto("/");
  await page.evaluate((authToken) => {
    window.sessionStorage.setItem("aos-e2e-token", authToken);
  }, token);
  await page.reload();
  await page.waitForFunction(
    () => Boolean((window as unknown as { __AOS_E2E_AUTH_READY__?: boolean }).__AOS_E2E_AUTH_READY__),
    undefined,
    { timeout: 45_000 },
  );
  await page.waitForTimeout(500);
}

test.describe("AOS founder browser journey (emulator-backed)", () => {
  test("learning governance path after workflow completion", async ({ page }) => {
    const state = loadState();

    await signIn(page, state.authToken);

    await page.goto(hashPath("/aos"));
    await expect(
      page.locator("#aos-main-content").getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible({ timeout: 45_000 });

    await page.goto(hashPath(`/aos/delivery/${state.engagementId}/retrospective`));
    await expect(page.getByRole("heading", { name: "Retrospective draft" })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(hashPath("/aos/learning"));
    await expect(page.getByRole("heading", { name: "Learning Review" })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto(hashPath(`/aos/learning?candidate=${encodeURIComponent(state.candidateId)}`));
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("button", { name: "Approve candidate" }).click();
    await expect(page.getByRole("button", { name: "Promote to catalog" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Promote to catalog" }).click();
    await page.getByRole("button", { name: "Promote now" }).click();
    await expect(page.getByText(/promoted to/i)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "View organizational asset" }).click();
    await expect(page).toHaveURL(/\/aos\/(knowledge|registry|playbook)/);
  });
});
