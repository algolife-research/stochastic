// E2E Tests for AIGA - Node Interactions

import { test, expect } from '@playwright/test';

test.describe('AIGA Node Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#aigaCanvas');
  });

  async function addNode(page, type, x, y) {
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ button: 'right', position: { x, y } });
    await page.locator(`[data-type="${type}"]`).click();
    // Small delay to ensure node is created
    await page.waitForTimeout(100);
  }

  test('should create and select a node', async ({ page }) => {
    await addNode(page, 'source', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Property panel should show source node properties
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Interval');
  });

  test('should show property panel for source node', async ({ page }) => {
    await addNode(page, 'source', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Interval');
    await expect(propContent).toContainText('Note');
    await expect(propContent).toContainText('Mode');
  });

  test('should show property panel for emitter node', async ({ page }) => {
    await addNode(page, 'emitter', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Reverb');
    await expect(propContent).toContainText('Pan');
  });

  test('should show property panel for pitch node', async ({ page }) => {
    await addNode(page, 'pitch', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Shift');
  });

  test('should delete node with Delete key', async ({ page }) => {
    await addNode(page, 'source', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Press Delete key
    await page.keyboard.press('Delete');
    
    // Property panel should show default message
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Right-click to add nodes');
  });

  test('should delete node with Backspace key', async ({ page }) => {
    await addNode(page, 'source', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Press Backspace key
    await page.keyboard.press('Backspace');
    
    // Property panel should show default message
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Right-click to add nodes');
  });

  test('should clear selection with Escape key', async ({ page }) => {
    await addNode(page, 'source', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Verify selection
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Interval');
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Selection should be cleared
    await expect(propContent).toContainText('Right-click to add nodes');
  });

  test('should drag node to new position', async ({ page }) => {
    await addNode(page, 'source', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Click and drag the node
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.mouse.down();
    await page.mouse.move(450, 400);
    await page.mouse.up();
    
    // Click at new position to verify node moved
    await canvas.click({ position: { x: 450, y: 400 } });
    
    const propContent = page.locator('#prop-content');
    await expect(propContent).toContainText('Interval');
  });
});
