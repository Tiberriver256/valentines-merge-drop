import { expect, test } from "@playwright/test";

async function forceGameOver(page, canvas) {
  const gameOverHeading = page.getByRole("heading", { name: /Game Over!/i });

  for (let batch = 0; batch < 14; batch += 1) {
    for (let tap = 0; tap < 18; tap += 1) {
      await canvas.tap({ position: { x: 180, y: 120 } });
    }

    await page.waitForTimeout(350);
    if (await gameOverHeading.isVisible().catch(() => false)) {
      return gameOverHeading;
    }
  }

  throw new Error("Failed to reach game-over state in test setup");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let fakeNow = 0;
    Date.now = () => {
      fakeNow += 600;
      return fakeNow;
    };
  });
});

test("play again resets game after game over on touch devices", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Maybe Later/i }).tap();

  const canvas = page.locator("div.cursor-crosshair");
  const gameOverHeading = await forceGameOver(page, canvas);
  await expect(gameOverHeading).toBeVisible();

  await page.getByRole("button", { name: /Play Again/i }).tap();
  await expect(gameOverHeading).toBeHidden();
});
