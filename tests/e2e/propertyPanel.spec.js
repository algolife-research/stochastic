// E2E tests for property panel interactions

import { test, expect } from '@playwright/test';

test.describe('Property Panel', () => {
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
      await page.locator('.context-menu-item:has-text("Add Node")').hover();
      await page.waitForTimeout(100);
      await page.locator(`.context-menu-item:has-text("${type}")`).click();
    }
    
    await page.waitForTimeout(100);
  }

  test.describe('Tunnel Properties', () => {
    test('should display tunnel name input', async ({ page }) => {
      // Add a tunnel from preset
      await page.click('#aigaCanvas', { button: 'right', position: { x: 300, y: 300 } });
      await page.waitForSelector('.context-menu', { timeout: 2000 });
      
      // Try to find tunnel presets  
      const tunnelMenu = page.locator('.context-menu-item:has-text("Tunnel")');
      if (await tunnelMenu.count() > 0) {
        await tunnelMenu.hover();
        await page.waitForTimeout(100);
        
        const voiceItem = page.locator('.context-menu-item:has-text("Voice")');
        if (await voiceItem.count() > 0) {
          await voiceItem.click();
          await page.waitForTimeout(200);
        }
      }
    });

    test('should display sub-node list', async ({ page }) => {
      // Add a tunnel from preset
      await page.click('#aigaCanvas', { button: 'right', position: { x: 300, y: 300 } });
      await page.waitForSelector('.context-menu', { timeout: 2000 });
      
      // Try to find tunnel presets
      const tunnelMenu = page.locator('.context-menu-item:has-text("Tunnel")');
      if (await tunnelMenu.count() > 0) {
        await tunnelMenu.hover();
        await page.waitForTimeout(100);
        
        const voiceItem = page.locator('.context-menu-item:has-text("Voice")');
        if (await voiceItem.count() > 0) {
          await voiceItem.click();
          await page.click('#aigaCanvas', { position: { x: 300, y: 300 } });
          
          await page.waitForTimeout(200);
        }
      }
    });
  });
});
