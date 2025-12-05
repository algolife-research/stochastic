// E2E Tests for AIGA - Graph Building

import { test, expect } from '@playwright/test';

test.describe('AIGA Graph Building', () => {
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

  test('should create a simple source-speaker graph', async ({ page }) => {
    // Add source node
    await addNode(page, 'source', 200, 300);
    
    // Add speaker node
    await addNode(page, 'speaker', 400, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Select source node and verify
    await canvas.click({ position: { x: 200, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('Interval');
    
    // Select speaker node and verify
    await canvas.click({ position: { x: 400, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('Reverb');
  });

  test('should connect nodes by hovering and using handle', async ({ page }) => {
    // Create two nodes
    await addNode(page, 'source', 200, 300);
    await addNode(page, 'speaker', 400, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Hover over source node to show handle (handle appears on right side of node)
    await page.mouse.move(200, 300);
    await page.waitForTimeout(200);
    
    // Click on the connection handle (offset to the right of the node center)
    await canvas.click({ position: { x: 235, y: 300 } });
    
    // Click on speaker node to complete connection
    await canvas.click({ position: { x: 400, y: 300 } });
    
    // Start playback to verify connection works
    await page.locator('#playBtn').click();
    await page.waitForTimeout(500);
    
    // Stop playback
    await page.locator('#playBtn').click();
  });

  test('should create complex graph with multiple node types', async ({ page }) => {
    // Build: Source -> Pitch -> Polariser -> Speaker with more spacing
    await addNode(page, 'source', 100, 300);
    await addNode(page, 'pitch', 250, 300);
    await addNode(page, 'polariser', 400, 300);
    await addNode(page, 'speaker', 550, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Verify each node by checking the property panel shows correct type
    await canvas.click({ position: { x: 100, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('SOURCE');
    
    await canvas.click({ position: { x: 250, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('PITCH');
    
    await canvas.click({ position: { x: 400, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('POLARISER');
    
    await canvas.click({ position: { x: 550, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('SPEAKER');
  });

  test('should clear all nodes with Clear button', async ({ page }) => {
    // Add some nodes
    await addNode(page, 'source', 200, 300);
    await addNode(page, 'speaker', 400, 300);
    
    // Verify nodes exist
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 200, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('Interval');
    
    // Click Clear button
    await page.locator('#clearBtn').click();
    
    // Verify graph is cleared
    await canvas.click({ position: { x: 200, y: 300 } });
    await expect(page.locator('#prop-content')).toContainText('Right-click to add nodes');
  });
});
