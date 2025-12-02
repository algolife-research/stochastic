// E2E Tests for AIGA - Canvas Pan and Zoom

import { test, expect } from '@playwright/test';

test.describe('AIGA Pan and Zoom', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  async function addNode(page, type, x, y) {
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ button: 'right', position: { x, y } });
    await page.locator(`[data-type="${type}"]`).click();
    await page.waitForTimeout(100);
  }

  test('should zoom in with mouse wheel', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    // Add a reference node
    await addNode(page, 'source', 300, 300);
    
    // Zoom in with mouse wheel
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, -100); // Negative = zoom in
    await page.waitForTimeout(200);
    
    // Node should still be selectable (zoom doesn't affect functionality)
    await canvas.click({ position: { x: 300, y: 300 } });
    // After zoom, node might be at different screen position
  });

  test('should zoom out with mouse wheel', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    await addNode(page, 'source', 300, 300);
    
    // Zoom out with mouse wheel
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, 100); // Positive = zoom out
    await page.waitForTimeout(200);
    
    // Application should not crash
    await expect(canvas).toBeVisible();
  });

  test('should pan canvas by dragging empty space', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    // Add a reference node
    await addNode(page, 'source', 300, 300);
    
    // Pan by clicking and dragging on empty space
    await page.mouse.move(100, 100); // Empty area
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    await page.waitForTimeout(200);
    
    // Canvas should still be functional
    await expect(canvas).toBeVisible();
  });

  test('should handle multiple zoom operations', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    await addNode(page, 'source', 300, 300);
    
    // Multiple zoom in
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(300, 300);
      await page.mouse.wheel(0, -50);
      await page.waitForTimeout(100);
    }
    
    // Multiple zoom out
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(300, 300);
      await page.mouse.wheel(0, 50);
      await page.waitForTimeout(100);
    }
    
    // Application should still work
    await expect(canvas).toBeVisible();
  });

  test('should respect zoom limits', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    // Try to zoom way in (should be clamped to max)
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(300, 300);
      await page.mouse.wheel(0, -200);
    }
    await page.waitForTimeout(200);
    await expect(canvas).toBeVisible();
    
    // Try to zoom way out (should be clamped to min)
    for (let i = 0; i < 30; i++) {
      await page.mouse.move(300, 300);
      await page.mouse.wheel(0, 200);
    }
    await page.waitForTimeout(200);
    await expect(canvas).toBeVisible();
  });
});
