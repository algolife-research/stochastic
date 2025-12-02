// E2E Tests for AIGA - Canvas Interactions

import { test, expect } from '@playwright/test';

test.describe('AIGA Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the canvas to be ready
    await page.waitForSelector('#aigaCanvas');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/AIGA/);
    await expect(page.locator('#aigaCanvas')).toBeVisible();
  });

  test('should display toolbar with controls', async ({ page }) => {
    await expect(page.locator('#playBtn')).toBeVisible();
    await expect(page.locator('#muteBtn')).toBeVisible();
    await expect(page.locator('#speedInput')).toBeVisible();
    await expect(page.locator('#saveBtn')).toBeVisible();
    await expect(page.locator('#loadBtn')).toBeVisible();
    await expect(page.locator('#clearBtn')).toBeVisible();
  });

  test('should toggle play/stop button', async ({ page }) => {
    const playBtn = page.locator('#playBtn');
    await expect(playBtn).toContainText('Play');
    
    await playBtn.click();
    await expect(playBtn).toContainText('Stop');
    
    await playBtn.click();
    await expect(playBtn).toContainText('Play');
  });

  test('should toggle mute button', async ({ page }) => {
    const muteBtn = page.locator('#muteBtn');
    await expect(muteBtn).toContainText('🔊');
    
    await muteBtn.click();
    await expect(muteBtn).toContainText('🔇');
    
    await muteBtn.click();
    await expect(muteBtn).toContainText('🔊');
  });

  test('should update BPM value', async ({ page }) => {
    const speedInput = page.locator('#speedInput');
    await speedInput.fill('180');
    await speedInput.blur();
    
    await expect(speedInput).toHaveValue('180');
  });

  test('should constrain BPM to valid range', async ({ page }) => {
    const speedInput = page.locator('#speedInput');
    
    // Test min value
    await speedInput.fill('10');
    await speedInput.blur();
    await expect(speedInput).toHaveValue('20');
    
    // Test max value
    await speedInput.fill('500');
    await speedInput.blur();
    await expect(speedInput).toHaveValue('300');
  });
});
