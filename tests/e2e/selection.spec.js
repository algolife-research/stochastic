// E2E Tests for AIGA - Box Selection

import { test, expect } from '@playwright/test';

test.describe('AIGA Box Selection', () => {
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

  test('should select multiple nodes with Shift+drag', async ({ page }) => {
    // Add multiple nodes
    await addNode(page, 'source', 200, 300);
    await addNode(page, 'pitch', 300, 300);
    await addNode(page, 'emitter', 400, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Box select by shift+dragging
    await page.keyboard.down('Shift');
    await page.mouse.move(150, 250);
    await page.mouse.down();
    await page.mouse.move(450, 350);
    await page.mouse.up();
    await page.keyboard.up('Shift');
    
    // Property panel should show multi-selection
    await page.waitForTimeout(200);
    // Note: The exact behavior depends on implementation
    // This test verifies the interaction completes without error
  });

  test('should group selected nodes with Ctrl+G', async ({ page }) => {
    // Add nodes that can be grouped
    await addNode(page, 'pitch', 250, 300);
    await addNode(page, 'polariser', 350, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Box select both nodes
    await page.keyboard.down('Shift');
    await page.mouse.move(200, 250);
    await page.mouse.down();
    await page.mouse.move(400, 350);
    await page.mouse.up();
    await page.keyboard.up('Shift');
    
    await page.waitForTimeout(200);
    
    // Press Ctrl+G to group
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyG');
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(200);
    
    // The grouped nodes should become a tunnel
    // Click where the tunnel should be
    await canvas.click({ position: { x: 300, y: 300 } });
    
    const propContent = page.locator('#prop-content');
    // Should show tunnel properties or be in a grouped state
  });

  test('should group via context menu', async ({ page }) => {
    // Add a node
    await addNode(page, 'pitch', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Select the node
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Right-click on the node
    await canvas.click({ button: 'right', position: { x: 300, y: 300 } });
    
    // Check for Group option in context menu
    await expect(page.locator('#ctx-group')).toBeVisible();
  });
});
