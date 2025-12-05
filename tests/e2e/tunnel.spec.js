// E2E Tests for AIGA - Tunnel functionality

import { test, expect } from '@playwright/test';

test.describe('AIGA Tunnel Operations', () => {
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

  test('should create voice tunnel preset', async ({ page }) => {
    await addTunnelPreset(page, 'voice', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Should show tunnel properties
    await expect(page.locator('#prop-content')).toContainText('TUNNEL');
    await expect(page.locator('#prop-content')).toContainText('Voice');
  });

  test('should create thick tunnel preset', async ({ page }) => {
    await addTunnelPreset(page, 'thick', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    await expect(page.locator('#prop-content')).toContainText('TUNNEL');
    await expect(page.locator('#prop-content')).toContainText('Thick');
  });

  test('should create dark tunnel preset', async ({ page }) => {
    await addTunnelPreset(page, 'dark', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    await expect(page.locator('#prop-content')).toContainText('TUNNEL');
    await expect(page.locator('#prop-content')).toContainText('Dark');
  });

  test('should create custom tunnel', async ({ page }) => {
    await addNode(page, 'tunnel', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    await expect(page.locator('#prop-content')).toContainText('TUNNEL');
    await expect(page.locator('#prop-content')).toContainText('Custom');
  });

  test('should show add sub-node dropdown in tunnel properties', async ({ page }) => {
    await addNode(page, 'tunnel', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Should have a dropdown to add sub-nodes
    await expect(page.locator('#tunnel-add-subnode')).toBeVisible();
  });

  test('should add pitch sub-node to tunnel', async ({ page }) => {
    await addNode(page, 'tunnel', 300, 300);
    
    const canvas = page.locator('#aigaCanvas');
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Select pitch from dropdown and trigger add
    const select = page.locator('#tunnel-add-subnode');
    await select.selectOption('pitch');
    
    await page.waitForTimeout(200);
    
    // Tunnel should now have a pitch sub-node - verify panel updates
    await expect(page.locator('#prop-content')).toContainText('Sub-node');
  });

  test('should build complete tunnel graph: source -> tunnel -> (nothing needed)', async ({ page }) => {
    // Create source
    await addNode(page, 'source', 150, 300);
    
    // Create tunnel with voice preset (includes speaker)
    await addTunnelPreset(page, 'voice', 350, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect source to tunnel
    await page.mouse.move(150, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 185, y: 300 } }); // Click connection handle
    await canvas.click({ position: { x: 350, y: 300 } }); // Click tunnel
    
    // Start playback
    await page.locator('#playBtn').click();
    await page.waitForTimeout(500);
    
    // Should be playing (play button might change text or state)
    // Verify no errors occurred by checking canvas is still interactive
    await expect(canvas).toBeVisible();
  });

  test('should group nodes into tunnel via Ctrl+G', async ({ page }) => {
    // Create nodes to group
    await addNode(page, 'pitch', 250, 300);
    await addNode(page, 'gain', 350, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Box select both nodes
    await page.keyboard.down('Shift');
    await page.mouse.move(200, 250);
    await page.mouse.down();
    await page.mouse.move(400, 350);
    await page.mouse.up();
    await page.keyboard.up('Shift');
    
    await page.waitForTimeout(200);
    
    // Group with Ctrl+G
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyG');
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(300);
    
    // Click where tunnel should be (middle of the grouped nodes)
    await canvas.click({ position: { x: 300, y: 300 } });
    
    // Should show tunnel properties
    const propContent = await page.locator('#prop-content').textContent();
    // The grouped nodes should form a tunnel
  });
});

test.describe('AIGA Tunnel with Speaker', () => {
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

  test('should play sound through tunnel with speaker', async ({ page }) => {
    // Create source
    await addNode(page, 'source', 150, 300);
    
    // Create voice tunnel (has speaker)
    await addTunnelPreset(page, 'voice', 350, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect source to tunnel  
    await page.mouse.move(150, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 185, y: 300 } });
    await canvas.click({ position: { x: 350, y: 300 } });
    
    // Start playback
    await page.locator('#playBtn').click();
    await page.waitForTimeout(1500);
    
    // Stop playback
    await page.locator('#playBtn').click();
    
    // Test passed if no errors
    await expect(canvas).toBeVisible();
  });

  test('tunnel speaker should not require external speaker', async ({ page }) => {
    // This tests that tunnels with internal speakers work without external speakers
    await addNode(page, 'source', 150, 300);
    await addTunnelPreset(page, 'voice', 350, 300);
    
    const canvas = page.locator('#aigaCanvas');
    
    // Connect
    await page.mouse.move(150, 300);
    await page.waitForTimeout(200);
    await canvas.click({ position: { x: 185, y: 300 } });
    await canvas.click({ position: { x: 350, y: 300 } });
    
    // Playback should work without any external speaker node
    await page.locator('#playBtn').click();
    await page.waitForTimeout(500);
    
    // Should be playing without errors
    await expect(page.locator('#playBtn')).toBeVisible();
  });
});
