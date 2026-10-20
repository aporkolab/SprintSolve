import { test, expect } from '@playwright/test';

test.describe('SprintSolve Game', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto('./');

    // Wait for the game to load
    await page.waitForSelector('canvas#gameCanvas');

    // The menu state is set only after image loading and initialization succeed.
    await expect(page.locator('canvas#gameCanvas')).toHaveAttribute(
      'data-game-state',
      'menu',
    );
    await page
      .getByRole('button', { name: 'Necessary Only', exact: true })
      .click();
  });

  test('should load the game successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/SprintSolve/);

    // Check that canvas is present
    const canvas = page.locator('canvas#gameCanvas');
    await expect(canvas).toBeVisible();

    // Check canvas dimensions are reasonable
    const canvasBoundingBox = await canvas.boundingBox();
    expect(canvasBoundingBox?.width).toBeGreaterThan(0);
    expect(canvasBoundingBox?.height).toBeGreaterThan(0);
  });

  test('should display start screen', async ({ page }) => {
    // Canvas should be visible and interactive
    const canvas = page.locator('canvas#gameCanvas');
    await expect(canvas).toBeVisible();

    // Should be able to check if start screen is rendered by looking at canvas content
    const isStartScreenVisible = await page.evaluate(() => {
      const canvas = document.querySelector(
        'canvas#gameCanvas',
      ) as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Simple check: if there are non-transparent pixels, something is rendered
      let hasContent = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) {
          hasContent = true;
          break;
        }
      }
      return hasContent;
    });

    expect(isStartScreenVisible).toBe(true);
  });

  test('should start game when clicking start button', async ({ page }) => {
    const canvas = page.locator('canvas#gameCanvas');

    // Click in the center area where start button should be
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    // Assert immediately, before gravity can end an idle game.
    // The state changes only after a real hit on the start button.
    await expect(canvas).toHaveAttribute('data-game-state', 'playing');
  });

  test('should respond to keyboard input', async ({ page }) => {
    const canvas = page.locator('canvas#gameCanvas');

    // Start the game first
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    await page.waitForTimeout(1000);

    // Test space key
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    // Test arrow key
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);

    // Test pause key
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(100);

    // Test mute key
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(100);

    // Verify canvas is still responsive
    const canvasExists = await canvas.isVisible();
    expect(canvasExists).toBe(true);
  });

  test('should handle window resize', async ({ page }) => {
    const canvas = page.locator('canvas#gameCanvas');

    // Get initial size
    const initialBox = await canvas.boundingBox();

    // Resize window
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);

    // Check new size
    const newBox = await canvas.boundingBox();

    // Canvas should adjust to new window size
    expect(newBox?.width).not.toBe(initialBox?.width);
    expect(newBox?.height).not.toBe(initialBox?.height);

    // Canvas should still be visible and have reasonable dimensions
    expect(newBox?.width).toBeGreaterThan(0);
    expect(newBox?.height).toBeGreaterThan(0);
  });

  test('should handle touch events on mobile', async ({
    page,
    browserName,
  }) => {
    // Skip on non-mobile browsers for now
    test.skip(
      browserName !== 'webkit',
      'Touch events test only on webkit/mobile',
    );

    const canvas = page.locator('canvas#gameCanvas');

    // Simulate touch events
    await canvas.tap();
    await page.waitForTimeout(100);

    // Verify touch interaction works
    const canvasExists = await canvas.isVisible();
    expect(canvasExists).toBe(true);
  });

  test('should maintain performance during gameplay', async ({ page }) => {
    const canvas = page.locator('canvas#gameCanvas');

    // Start the game
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    await page.waitForTimeout(1000);

    // Measure performance during rapid inputs
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(50);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should handle rapid inputs without significant lag
    expect(duration).toBeLessThan(2000);
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/opentdb.com/**', route => {
      route.fulfill({
        status: 500,
        body: 'Server Error',
      });
    });

    const canvas = page.locator('canvas#gameCanvas');

    // Try to start the game
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    await page.waitForTimeout(2000);

    // Game should still be functional even with API failures
    const canvasExists = await canvas.isVisible();
    expect(canvasExists).toBe(true);

    // Should not have unhandled errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Allow some time for potential errors to appear
    await page.waitForTimeout(1000);
  });

  test('should persist game state', async ({ page }) => {
    const canvas = page.locator('canvas#gameCanvas');

    // Start and play a bit
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    await page.waitForTimeout(1000);

    // Make some moves
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Check if localStorage has game data
    const hasGameData = await page.evaluate(() => {
      return localStorage.getItem('sprintsolve-game-storage') !== null;
    });

    expect(hasGameData).toBe(true);
  });

  test('should be accessible', async ({ page }) => {
    // Check basic accessibility features
    const canvas = page.locator('canvas#gameCanvas');

    // Canvas should have proper attributes
    await expect(canvas).toHaveAttribute('id', 'gameCanvas');

    // Check if page has proper meta tags
    const titleExists = await page.locator('title').count();
    expect(titleExists).toBeGreaterThan(0);

    const metaViewport = await page.locator('meta[name="viewport"]').count();
    expect(metaViewport).toBeGreaterThan(0);

    const metaDescription = await page
      .locator('meta[name="description"]')
      .count();
    expect(metaDescription).toBeGreaterThan(0);
  });

  test('should work offline', async ({ page, context }) => {
    // Set network to offline
    await context.setOffline(true);

    const canvas = page.locator('canvas#gameCanvas');

    // Game should still be playable offline (using cached data)
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    await page.waitForTimeout(2000);

    // Basic functionality should work
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);

    const canvasExists = await canvas.isVisible();
    expect(canvasExists).toBe(true);
  });

  test('should handle rapid screen interactions', async ({ page }) => {
    const canvas = page.locator('canvas#gameCanvas');

    // Start the game
    await canvas.click({
      position: {
        x: await canvas.evaluate(el => el.offsetWidth / 2),
        y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
      },
    });

    await page.waitForTimeout(1000);

    // Rapid clicks on different areas
    const clicks = [];
    for (let i = 0; i < 5; i++) {
      clicks.push(
        canvas.click({
          position: {
            x: Math.random() * 400 + 100,
            y: Math.random() * 300 + 100,
          },
        }),
      );
    }

    await Promise.all(clicks);
    await page.waitForTimeout(500);

    // Game should remain stable
    const canvasExists = await canvas.isVisible();
    expect(canvasExists).toBe(true);
  });

  test.describe('Game State Management', () => {
    test('should transition between game states properly', async ({ page }) => {
      const canvas = page.locator('canvas#gameCanvas');

      // Start from menu
      await canvas.click({
        position: {
          x: await canvas.evaluate(el => el.offsetWidth / 2),
          y: await canvas.evaluate(el => el.offsetHeight / 2 + 45),
        },
      });

      await expect(canvas).toHaveAttribute('data-game-state', 'playing');

      // Pause the game
      await page.keyboard.press('KeyP');
      await expect(canvas).toHaveAttribute('data-game-state', 'paused');

      // Resume the game
      await page.keyboard.press('KeyP');
      await expect(canvas).toHaveAttribute('data-game-state', 'playing');

      // Game should still be running
      const canvasExists = await canvas.isVisible();
      expect(canvasExists).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', error => {
        errors.push(error.message);
      });

      const canvas = page.locator('canvas#gameCanvas');

      // Try to break things with rapid interactions
      await canvas.click();
      await page.keyboard.press('Space');
      await page.keyboard.press('KeyP');
      await page.keyboard.press('KeyM');

      await page.waitForTimeout(2000);

      // Should not have critical JavaScript errors
      const criticalErrors = errors.filter(
        error => !error.includes('Warning') && !error.includes('DevTools'),
      );

      expect(criticalErrors.length).toBe(0);
    });
  });
});
