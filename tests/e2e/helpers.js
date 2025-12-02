// E2E Test Helpers for AIGA
// Common utilities and fixtures for Playwright tests

/**
 * Add a node to the canvas via context menu
 * @param {Page} page - Playwright page object
 * @param {string} type - Node type (source, emitter, pitch, etc.)
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export async function addNode(page, type, x, y) {
  const canvas = page.locator('#aigaCanvas');
  await canvas.click({ button: 'right', position: { x, y } });
  await page.locator(`[data-type="${type}"]`).click();
  await page.waitForTimeout(100);
}

/**
 * Add a tunnel preset via context menu
 * @param {Page} page - Playwright page object
 * @param {string} template - Template key (voice, thick, dark)
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export async function addTunnelPreset(page, template, x, y) {
  const canvas = page.locator('#aigaCanvas');
  await canvas.click({ button: 'right', position: { x, y } });
  await page.locator(`[data-template="${template}"]`).click();
  await page.waitForTimeout(100);
}

/**
 * Select a node at the given position
 * @param {Page} page - Playwright page object
 * @param {number} x - X position
 * @param {number} y - Y position
 */
export async function selectNode(page, x, y) {
  const canvas = page.locator('#aigaCanvas');
  await canvas.click({ position: { x, y } });
  await page.waitForTimeout(50);
}

/**
 * Delete the currently selected node
 * @param {Page} page - Playwright page object
 */
export async function deleteSelectedNode(page) {
  await page.keyboard.press('Delete');
  await page.waitForTimeout(50);
}

/**
 * Clear all nodes from the canvas
 * @param {Page} page - Playwright page object
 */
export async function clearCanvas(page) {
  await page.locator('#clearBtn').click();
  await page.waitForTimeout(50);
}

/**
 * Start playback
 * @param {Page} page - Playwright page object
 */
export async function startPlayback(page) {
  const playBtn = page.locator('#playBtn');
  if (await playBtn.textContent() === '▶ Play') {
    await playBtn.click();
    await page.waitForTimeout(100);
  }
}

/**
 * Stop playback
 * @param {Page} page - Playwright page object
 */
export async function stopPlayback(page) {
  const playBtn = page.locator('#playBtn');
  if (await playBtn.textContent() === '⏹ Stop') {
    await playBtn.click();
    await page.waitForTimeout(100);
  }
}

/**
 * Load an example by key
 * @param {Page} page - Playwright page object
 * @param {string} exampleKey - Example key from dropdown
 */
export async function loadExample(page, exampleKey) {
  await page.locator('#exampleSelect').selectOption(exampleKey);
  await page.waitForTimeout(200);
}

/**
 * Set BPM value
 * @param {Page} page - Playwright page object
 * @param {number} bpm - BPM value
 */
export async function setBPM(page, bpm) {
  const speedInput = page.locator('#speedInput');
  await speedInput.fill(String(bpm));
  await speedInput.blur();
  await page.waitForTimeout(50);
}

/**
 * Box select nodes in a region
 * @param {Page} page - Playwright page object
 * @param {Object} start - Start position {x, y}
 * @param {Object} end - End position {x, y}
 */
export async function boxSelect(page, start, end) {
  await page.keyboard.down('Shift');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
}

/**
 * Group selected nodes (Ctrl+G)
 * @param {Page} page - Playwright page object
 */
export async function groupSelectedNodes(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyG');
  await page.keyboard.up('Control');
  await page.waitForTimeout(100);
}
