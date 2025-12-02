// E2E Tests for AIGA - Context Menu and Node Creation

import { test, expect } from '@playwright/test';

test.describe('AIGA Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  test('should open context menu on right-click', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    // Right-click on canvas
    await canvas.click({ button: 'right', position: { x: 300, y: 300 } });
    
    // Context menu should be visible
    await expect(page.locator('#context-menu')).toBeVisible();
  });

  test('should show add node options', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ button: 'right', position: { x: 300, y: 300 } });
    
    // Check for node type options
    await expect(page.locator('[data-type="source"]')).toBeVisible();
    await expect(page.locator('[data-type="emitter"]')).toBeVisible();
    await expect(page.locator('[data-type="pitch"]')).toBeVisible();
    await expect(page.locator('[data-type="delay"]')).toBeVisible();
  });

  test('should add source node via context menu', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    // Right-click and add source node
    await canvas.click({ button: 'right', position: { x: 300, y: 300 } });
    await page.locator('[data-type="source"]').click();
    
    // Context menu should close
    await expect(page.locator('#context-menu')).not.toBeVisible();
    
    // Node should be visible on canvas (we verify by checking prop panel shows)
    // Click at the same position to select the node
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Property panel should show node properties
    await expect(page.locator('#prop-content')).not.toContainText('Right-click to add nodes');
  });

  test('should add emitter node via context menu', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    await canvas.click({ button: 'right', position: { x: 400, y: 300 } });
    await page.locator('[data-type="emitter"]').click();
    
    await expect(page.locator('#context-menu')).not.toBeVisible();
  });

  test('should close context menu on canvas click', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    // Open context menu
    await canvas.click({ button: 'right', position: { x: 300, y: 300 } });
    await expect(page.locator('#context-menu')).toBeVisible();
    
    // Click elsewhere on canvas
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Context menu should close
    await expect(page.locator('#context-menu')).not.toBeVisible();
  });

  test('should add tunnel preset via context menu', async ({ page }) => {
    const canvas = page.locator('#aigaCanvas');
    
    await canvas.click({ button: 'right', position: { x: 300, y: 300 } });
    
    // Check for tunnel presets
    await expect(page.locator('[data-template="voice"]')).toBeVisible();
    await expect(page.locator('[data-template="thick"]')).toBeVisible();
    await expect(page.locator('[data-template="dark"]')).toBeVisible();
  });
});
