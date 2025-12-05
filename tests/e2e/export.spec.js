// E2E Tests for AIGA - Export functionality

import { test, expect } from '@playwright/test';

test.describe('AIGA Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  async function addNode(page, type, x, y) {
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ button: 'right', position: { x, y } });
    await page.waitForSelector('#context-menu', { timeout: 2000 });
    await page.locator(`[data-type="${type}"]`).click();
    await page.waitForTimeout(100);
  }

  async function addTunnelPreset(page, template, x, y) {
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ button: 'right', position: { x, y } });
    await page.waitForSelector('#context-menu', { timeout: 2000 });
    await page.locator(`[data-template="${template}"]`).click();
    await page.waitForTimeout(100);
  }

  test('should have export button visible', async ({ page }) => {
    await expect(page.locator('#exportBtn')).toBeVisible();
  });

  test('should open export dialog on button click', async ({ page }) => {
    await page.locator('#exportBtn').click();
    
    // Export dialog should appear
    await expect(page.locator('#export-modal')).toBeVisible();
  });

  test('should close export dialog with close button', async ({ page }) => {
    await page.locator('#exportBtn').click();
    await expect(page.locator('#export-modal')).toBeVisible();
    
    // Close the dialog
    await page.locator('#export-modal #export-close').click();
    
    await expect(page.locator('#export-modal')).not.toBeVisible();
  });

  test('should show error when exporting empty graph', async ({ page }) => {
    await page.locator('#exportBtn').click();
    await expect(page.locator('#export-modal')).toBeVisible();
    
    // Try to export
    await page.locator('#do-export-btn').click();
    
    // Should show error (no speakers)
    await expect(page.locator('#export-error')).toBeVisible();
  });

  test('should show error when graph has no speakers', async ({ page }) => {
    // Create graph without speakers
    await addNode(page, 'source', 200, 300);
    await addNode(page, 'pitch', 400, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect them
    await page.mouse.move(200, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 235, y: 300 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Try to export
    await page.locator('#exportBtn').click();
    await page.locator('#do-export-btn').click();
    
    // Should show error about no speakers
    await expect(page.locator('#export-error')).toBeVisible();
  });

  test('should allow export when graph has speaker', async ({ page }) => {
    // Create graph with speaker
    await addNode(page, 'source', 200, 300);
    await addNode(page, 'speaker', 400, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect them
    await page.mouse.move(200, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 235, y: 300 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Try to export
    await page.locator('#exportBtn').click();
    
    // Error should not be shown initially (or disappear after valid graph)
    // Export button should be enabled
    await expect(page.locator('#do-export-btn')).toBeEnabled();
  });

  test('should allow export when tunnel has speaker', async ({ page }) => {
    // Create graph with tunnel containing speaker
    await addNode(page, 'source', 200, 300);
    await addTunnelPreset(page, 'voice', 400, 300); // Voice preset has speaker
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect them
    await page.mouse.move(200, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 235, y: 300 } });
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Try to export
    await page.locator('#exportBtn').click();
    
    // Export button should be enabled
    await expect(page.locator('#do-export-btn')).toBeEnabled();
  });

  test('should have duration input in export dialog', async ({ page }) => {
    await page.locator('#exportBtn').click();
    
    await expect(page.locator('#export-duration')).toBeVisible();
  });

  test('should have format selection in export dialog', async ({ page }) => {
    await page.locator('#exportBtn').click();
    
    // Should have WAV format option
    await expect(page.locator('#export-format')).toBeVisible();
  });

  test('should allow changing export duration', async ({ page }) => {
    await page.locator('#exportBtn').click();
    
    const durationInput = page.locator('#export-duration');
    await durationInput.fill('10');
    
    expect(await durationInput.inputValue()).toBe('10');
  });
});

test.describe('AIGA Save/Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  async function addNode(page, type, x, y) {
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ button: 'right', position: { x, y } });
    await page.waitForSelector('#context-menu', { timeout: 2000 });
    await page.locator(`[data-type="${type}"]`).click();
    await page.waitForTimeout(100);
  }

  test('should have save button visible', async ({ page }) => {
    await expect(page.locator('#saveBtn')).toBeVisible();
  });

  test('should have load button visible', async ({ page }) => {
    await expect(page.locator('#loadBtn')).toBeVisible();
  });

  test('should have clear button visible', async ({ page }) => {
    await expect(page.locator('#clearBtn')).toBeVisible();
  });

  test('should clear all nodes with clear button', async ({ page }) => {
    // Add some nodes
    await addNode(page, 'source', 200, 300);
    await addNode(page, 'speaker', 400, 300);
    
    // Clear
    await page.locator('#clearBtn').click();
    
    // Try to select where nodes were - should show empty panel
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    
    // Panel should show default content
    await expect(page.locator('#prop-content')).toContainText('Right-click');
  });
});
