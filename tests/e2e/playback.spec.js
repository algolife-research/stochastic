// E2E Tests for AIGA - Playback and Audio

import { test, expect } from '@playwright/test';

test.describe('AIGA Playback Controls', () => {
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

  test('should have play button visible', async ({ page }) => {
    await expect(page.locator('#playBtn')).toBeVisible();
  });

  test('should have speed input visible', async ({ page }) => {
    await expect(page.locator('#speedInput')).toBeVisible();
  });

  test('should start with default BPM', async ({ page }) => {
    const speedInput = page.locator('#speedInput');
    const value = await speedInput.inputValue();
    expect(parseInt(value)).toBeGreaterThan(0);
  });

  test('should toggle play/pause', async ({ page }) => {
    const playBtn = page.locator('#playBtn');
    
    // Initial state
    const initialText = await playBtn.textContent();
    
    // Click to start playing
    await playBtn.click();
    await page.waitForTimeout(100);
    
    // Click to stop
    await playBtn.click();
    await page.waitForTimeout(100);
    
    // Should be back to initial state
    const finalText = await playBtn.textContent();
    expect(finalText).toBe(initialText);
  });

  test('should change BPM via speed input', async ({ page }) => {
    const speedInput = page.locator('#speedInput');
    
    await speedInput.fill('180');
    await speedInput.press('Enter');
    
    const value = await speedInput.inputValue();
    expect(value).toBe('180');
  });

  test('should play simple source-speaker graph', async ({ page }) => {
    // Create source
    await addNode(page, 'source', 200, 300);
    // Create speaker
    await addNode(page, 'speaker', 400, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect source to speaker
    await page.mouse.move(200, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 235, y: 300 } }); // Connection handle
    await canvas.click({ position: { x: 400, y: 300 } }); // Speaker
    
    // Start playback
    await page.locator('#playBtn').click();
    await page.waitForTimeout(1000);
    
    // Verify playback started (no crash)
    await expect(canvas).toBeVisible();
    
    // Stop playback
    await page.locator('#playBtn').click();
  });

  test('should handle play with no graph', async ({ page }) => {
    // Start playback with empty graph
    await page.locator('#playBtn').click();
    await page.waitForTimeout(500);
    
    // Should not crash
    await expect(page.locator('#aigaCanvas')).toBeVisible();
    
    // Stop playback
    await page.locator('#playBtn').click();
  });

  test('should handle rapid play/pause toggles', async ({ page }) => {
    const playBtn = page.locator('#playBtn');
    
    // Rapid toggles
    for (let i = 0; i < 5; i++) {
      await playBtn.click();
      await page.waitForTimeout(50);
    }
    
    // Should not crash
    await expect(page.locator('#aigaCanvas')).toBeVisible();
  });
});

test.describe('AIGA BPM and Timing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  test('should accept BPM values between valid range', async ({ page }) => {
    const speedInput = page.locator('#speedInput');
    
    // Set low BPM
    await speedInput.fill('60');
    await speedInput.press('Enter');
    expect(await speedInput.inputValue()).toBe('60');
    
    // Set high BPM
    await speedInput.fill('240');
    await speedInput.press('Enter');
    expect(await speedInput.inputValue()).toBe('240');
  });

  test('should show current BPM in header', async ({ page }) => {
    // BPM should be visible somewhere in the UI
    const speedInput = page.locator('#speedInput');
    await expect(speedInput).toBeVisible();
  });
});
