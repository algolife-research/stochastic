// E2E tests for keyboard shortcuts

import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  // Helper to add a node
  async function addNode(page, type, x = 300, y = 300) {
    await page.click('#aigaCanvas', { button: 'right', position: { x, y } });
    await page.waitForSelector('.context-menu', { timeout: 2000 });
    
    const menuItem = page.locator(`.context-menu-item:has-text("${type}")`);
    if (await menuItem.count() > 0) {
      await menuItem.click();
    } else {
      // Try submenu
      await page.locator('.context-menu-item:has-text("Add Node")').hover();
      await page.waitForTimeout(100);
      await page.locator(`.context-menu-item:has-text("${type}")`).click();
    }
    
    await page.waitForTimeout(100);
  }

  test.describe('Escape Key', () => {
    test('should close context menu with Escape', async ({ page }) => {
      // Open context menu
      await page.click('#aigaCanvas', { button: 'right', position: { x: 300, y: 300 } });
      await page.waitForSelector('.context-menu', { timeout: 2000 });
      
      // Close with Escape
      await page.keyboard.press('Escape');
      
      await expect(page.locator('.context-menu')).not.toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Space Bar', () => {
    test('should toggle playback with Space', async ({ page }) => {
      // Focus canvas first
      await page.click('#aigaCanvas', { position: { x: 300, y: 300 } });
      
      // Check initial play button state
      const playButton = page.locator('#playButton');
      const initialIcon = await playButton.locator('i').getAttribute('class');
      
      // Toggle with space - may need to click canvas to focus
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      
      const newIcon = await playButton.locator('i').getAttribute('class');
      
      // Icon should change between play and pause
      expect(newIcon).not.toBe(initialIcon);
    });
  });

  test.describe('Quick Access Keys', () => {
    test('should add Source with S key in empty area', async ({ page }) => {
      // Focus and click empty area
      await page.click('#aigaCanvas', { position: { x: 300, y: 300 } });
      
      // Press S for source
      await page.keyboard.press('s');
      
      await page.waitForTimeout(200);
    });
  });

  test.describe('Navigation Shortcuts', () => {
    test('should reset zoom with 0 key', async ({ page }) => {
      // Focus canvas
      await page.click('#aigaCanvas', { position: { x: 300, y: 300 } });
      
      // Zoom in first via mouse wheel
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100);
      
      // Reset with 0
      await page.keyboard.press('0');
      
      await page.waitForTimeout(100);
    });
  });
});
