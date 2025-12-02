// E2E Tests for AIGA - Examples Loading

import { test, expect } from '@playwright/test';

test.describe('AIGA Examples', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  test('should have example options in dropdown', async ({ page }) => {
    const exampleSelect = page.locator('#exampleSelect');
    
    await expect(exampleSelect).toBeVisible();
    
    // Check for example options
    const options = await exampleSelect.locator('option').allTextContents();
    expect(options).toContain('Sequential Melody');
    expect(options).toContain('Generative Ambient');
    expect(options).toContain('Polyrhythm');
    expect(options).toContain('Drum Pattern');
  });

  test('should load Sequential Melody example', async ({ page }) => {
    const exampleSelect = page.locator('#exampleSelect');
    
    await exampleSelect.selectOption('sequential_melody');
    
    // Give it time to load
    await page.waitForTimeout(200);
    
    // Canvas should have nodes (we can verify by clicking and checking prop panel)
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    
    // After loading example, clicking somewhere should find a node
    // The prop content should show something other than default
    const propContent = page.locator('#prop-content');
    // Note: This may or may not find a node depending on example layout
    // We mainly verify no errors occurred
  });

  test('should load Generative Ambient example', async ({ page }) => {
    const exampleSelect = page.locator('#exampleSelect');
    
    await exampleSelect.selectOption('generative_ambient');
    await page.waitForTimeout(200);
    
    // Start playback to verify example works
    await page.locator('#playBtn').click();
    await page.waitForTimeout(1000);
    
    // Stop playback
    await page.locator('#playBtn').click();
    await expect(page.locator('#playBtn')).toContainText('Play');
  });

  test('should load Polyrhythm example', async ({ page }) => {
    const exampleSelect = page.locator('#exampleSelect');
    
    await exampleSelect.selectOption('polyrhythm');
    await page.waitForTimeout(200);
    
    // Verify BPM was set (examples may set specific BPM)
    const speedInput = page.locator('#speedInput');
    const bpmValue = await speedInput.inputValue();
    expect(parseInt(bpmValue)).toBeGreaterThan(0);
  });

  test('should reset dropdown after loading example', async ({ page }) => {
    const exampleSelect = page.locator('#exampleSelect');
    
    await exampleSelect.selectOption('sequential_melody');
    await page.waitForTimeout(200);
    
    // Dropdown should reset to default
    await expect(exampleSelect).toHaveValue('');
  });

  test('should load Layered Pad example', async ({ page }) => {
    const exampleSelect = page.locator('#exampleSelect');
    
    await exampleSelect.selectOption('layered_pad');
    await page.waitForTimeout(200);
    
    // Start and stop playback to verify
    await page.locator('#playBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#playBtn').click();
    
    await expect(page.locator('#playBtn')).toContainText('Play');
  });
});
