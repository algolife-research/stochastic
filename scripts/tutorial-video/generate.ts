/**
 * Tutorial Video Generator
 * 
 * Usage:
 *   npx ts-node scripts/tutorial-video/generate.ts first-sound
 * 
 * Requirements:
 *   npm install playwright @playwright/test
 *   npx playwright install chromium
 *   Set OPENAI_API_KEY environment variable for voice generation
 */

import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import type { TutorialVideoScript, TutorialAction } from './types';

// Import tutorial scripts
import { firstSoundTutorial } from './scripts/first-sound';

const TUTORIALS: Record<string, TutorialVideoScript> = {
  'first-sound': firstSoundTutorial,
};

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEV_SERVER_URL = 'http://localhost:1420';
const OUTPUT_DIR = path.join(__dirname, '../../dist/tutorials');
const TEMP_DIR = path.join(__dirname, '../../temp/tutorial-gen');

// ============================================================================
// Voice Generation (OpenAI TTS)
// ============================================================================

async function generateVoiceover(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set, skipping voice generation');
    // Create silence placeholder
    execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 3 -q:a 9 -y "${outputPath}"`, { stdio: 'pipe' });
    return;
  }
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice: 'onyx',
      input: text,
      response_format: 'mp3',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  console.log(`  ✓ Generated voice: ${path.basename(outputPath)}`);
}

// ============================================================================
// Action Execution
// ============================================================================

async function executeAction(page: Page, action: TutorialAction): Promise<void> {
  switch (action.type) {
    case 'wait':
      await page.waitForTimeout(action.ms);
      break;
      
    case 'click':
      await page.click(action.selector);
      break;
      
    case 'rightClick':
      await page.mouse.click(action.x, action.y, { button: 'right' });
      await page.waitForTimeout(300); // Wait for context menu to appear
      break;
      
    case 'selectContextMenu':
      // Wait for context menu and click item - try multiple selectors
      await page.waitForTimeout(200);
      const menuSelectors = [
        `text="${action.item}"`,
        `button:has-text("${action.item}")`,
        `[role="menuitem"]:has-text("${action.item}")`,
        `div:has-text("${action.item}")`,
      ];
      let clicked = false;
      for (const sel of menuSelectors) {
        try {
          const el = await page.$(sel);
          if (el && await el.isVisible()) {
            await el.click();
            clicked = true;
            break;
          }
        } catch {
          // Try next
        }
      }
      if (!clicked) {
        // Fallback: just click by text
        await page.click(`text="${action.item}"`, { timeout: 3000 });
      }
      await page.waitForTimeout(200);
      break;
      
    case 'drag':
      await page.mouse.move(action.from.x, action.from.y);
      await page.mouse.down();
      await page.mouse.move(action.to.x, action.to.y, { steps: 20 });
      await page.mouse.up();
      break;
      
    case 'pressKey':
      await page.keyboard.press(action.key);
      break;
      
    case 'type':
      await page.keyboard.type(action.text);
      break;
      
    case 'moveMouse':
      await page.mouse.move(action.x, action.y, { steps: 10 });
      break;
      
    case 'highlight':
      // Inject highlight overlay
      await page.evaluate(({ selector, duration }) => {
        const el = document.querySelector(selector);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          left: ${rect.left - 4}px;
          top: ${rect.top - 4}px;
          width: ${rect.width + 8}px;
          height: ${rect.height + 8}px;
          border: 3px solid #4caf50;
          border-radius: 8px;
          pointer-events: none;
          z-index: 99999;
          animation: pulse 0.5s ease-in-out infinite alternate;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), duration);
      }, { selector: action.selector, duration: action.duration });
      await page.waitForTimeout(action.duration);
      break;
  }
}

// ============================================================================
// Video Recording
// ============================================================================

async function recordTutorial(
  script: TutorialVideoScript,
  browser: Browser
): Promise<string> {
  const videoPath = path.join(TEMP_DIR, `${script.id}-raw.webm`);
  
  const context = await browser.newContext({
    viewport: script.resolution,
    recordVideo: {
      dir: TEMP_DIR,
      size: script.resolution,
    },
  });
  
  const page = await context.newPage();
  
  // Navigate to app
  console.log('  → Loading app...');
  await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Dismiss any startup modals - try multiple options
  console.log('  → Dismissing startup modals...');
  
  // Try clicking "Start Empty" or "Explore" or similar buttons
  const dismissButtons = [
    'text="Start Empty"',
    'text="Start Temporary Session"',
    'text="Explore"',
    'text="Skip"',
    'text="Close"',
    'text="Cancel"',
    'button:has-text("Empty")',
    'button:has-text("Temporary")',
    '.modal button:first-of-type',
    '[class*="modal"] button',
  ];
  
  for (const selector of dismissButtons) {
    try {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        await element.click();
        console.log(`    ✓ Clicked: ${selector}`);
        await page.waitForTimeout(500);
        break;
      }
    } catch {
      // Try next selector
    }
  }
  
  // Wait for any modal animations to complete
  await page.waitForTimeout(1000);
  
  // Click on canvas to ensure it has focus and dismiss any remaining overlays
  try {
    const canvas = await page.$('canvas');
    if (canvas) {
      await canvas.click();
      console.log('    ✓ Focused canvas');
    }
  } catch {
    // Canvas might not exist yet
  }
  
  await page.waitForTimeout(500);
  
  // Execute all segments
  for (let i = 0; i < script.segments.length; i++) {
    const segment = script.segments[i];
    console.log(`  → Segment ${i + 1}/${script.segments.length}: "${segment.narration.slice(0, 40)}..."`);
    
    // Execute actions
    for (const action of segment.actions) {
      await executeAction(page, action);
    }
    
    // Pause after segment
    if (segment.pauseAfter) {
      await page.waitForTimeout(segment.pauseAfter);
    }
  }
  
  // Final pause
  await page.waitForTimeout(1000);
  
  // Close and save video
  await context.close();
  
  // Get the actual video path (Playwright names it differently)
  const files = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.webm'));
  const latestVideo = files.sort().pop();
  
  if (latestVideo) {
    const actualPath = path.join(TEMP_DIR, latestVideo);
    fs.renameSync(actualPath, videoPath);
  }
  
  return videoPath;
}

// ============================================================================
// Audio Assembly
// ============================================================================

async function generateAudioTrack(script: TutorialVideoScript): Promise<string> {
  const audioFiles: string[] = [];
  
  // Generate voice for each segment
  for (let i = 0; i < script.segments.length; i++) {
    const segment = script.segments[i];
    const audioPath = path.join(TEMP_DIR, `${script.id}-segment-${i}.mp3`);
    await generateVoiceover(segment.narration, audioPath);
    audioFiles.push(audioPath);
    
    // Add pause if specified
    if (segment.pauseAfter) {
      const silencePath = path.join(TEMP_DIR, `${script.id}-silence-${i}.mp3`);
      const silenceDuration = segment.pauseAfter / 1000;
      execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t ${silenceDuration} -q:a 9 -y "${silencePath}"`, { stdio: 'pipe' });
      audioFiles.push(silencePath);
    }
  }
  
  // Concatenate all audio files
  const listPath = path.join(TEMP_DIR, `${script.id}-audiolist.txt`);
  const listContent = audioFiles.map(f => `file '${f}'`).join('\n');
  fs.writeFileSync(listPath, listContent);
  
  const outputPath = path.join(TEMP_DIR, `${script.id}-audio.mp3`);
  execSync(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${outputPath}"`, { stdio: 'pipe' });
  
  return outputPath;
}

// ============================================================================
// Final Muxing
// ============================================================================

function muxVideoAudio(videoPath: string, audioPath: string, outputPath: string): void {
  // Combine video and audio, trim to shortest
  execSync(`ffmpeg -i "${videoPath}" -i "${audioPath}" -c:v libx264 -c:a aac -shortest -y "${outputPath}"`, { stdio: 'pipe' });
  console.log(`  ✓ Created: ${outputPath}`);
}

function generateThumbnail(videoPath: string, outputPath: string): void {
  execSync(`ffmpeg -i "${videoPath}" -ss 00:00:05 -vframes 1 -y "${outputPath}"`, { stdio: 'pipe' });
  console.log(`  ✓ Thumbnail: ${outputPath}`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const tutorialId = process.argv[2];
  const skipServer = process.argv.includes('--no-server');
  
  if (!tutorialId || !TUTORIALS[tutorialId]) {
    console.log('Available tutorials:');
    Object.keys(TUTORIALS).forEach(id => {
      console.log(`  - ${id}: ${TUTORIALS[id].title}`);
    });
    console.log('\nUsage: npx tsx scripts/tutorial-video/generate.ts <tutorial-id> [--no-server]');
    console.log('  --no-server: Skip starting dev server (use if already running)');
    process.exit(1);
  }
  
  const script = TUTORIALS[tutorialId];
  console.log(`\n🎬 Generating: ${script.title}\n`);
  
  // Ensure directories exist
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  
  // Check for FFmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('❌ FFmpeg not found. Please install FFmpeg and add it to PATH.');
    process.exit(1);
  }
  
  // Start dev server (unless --no-server)
  let server: ChildProcess | null = null;
  
  if (skipServer) {
    console.log('Skipping server start (--no-server)');
    // Verify server is running
    try {
      await fetch(DEV_SERVER_URL);
      console.log('Dev server already running!\n');
    } catch {
      console.error('❌ Dev server not running. Start it with: npm run dev');
      process.exit(1);
    }
  } else {
    console.log('Starting dev server...');
    server = spawn('npm', ['run', 'dev'], { 
      cwd: path.join(__dirname, '../..'),
      shell: true,
      stdio: 'pipe',
    });
    
    server.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('ready')) {
        console.log('  Server output:', output.trim());
      }
    });
    
    server.stderr?.on('data', (data) => {
      console.error('  Server error:', data.toString().trim());
    });
    
    server.on('error', (err) => {
      console.error('Failed to start server:', err);
    });
    
    // Wait for server to be ready (with timeout)
    const serverTimeout = 30000;
    const startTime = Date.now();
    
    await new Promise<void>((resolve, reject) => {
      const checkServer = setInterval(async () => {
        if (Date.now() - startTime > serverTimeout) {
          clearInterval(checkServer);
          reject(new Error('Server startup timeout'));
          return;
        }
        
        try {
          const response = await fetch(DEV_SERVER_URL);
          if (response.ok) {
            clearInterval(checkServer);
            resolve();
          }
        } catch {
          // Still starting...
        }
      }, 1000);
    });
    console.log('Dev server ready!\n');
  }
  
  try {
    // Launch browser
    console.log('Recording video...');
    const browser = await chromium.launch({ headless: false }); // Set to true for CI
    const rawVideoPath = await recordTutorial(script, browser);
    await browser.close();
    console.log('  ✓ Video recorded\n');
    
    // Generate audio
    console.log('Generating audio...');
    const audioPath = await generateAudioTrack(script);
    console.log('  ✓ Audio generated\n');
    
    // Mux together
    console.log('Creating final video...');
    const finalPath = path.join(OUTPUT_DIR, `${script.id}.mp4`);
    muxVideoAudio(rawVideoPath, audioPath, finalPath);
    
    // Generate thumbnail
    const thumbPath = path.join(OUTPUT_DIR, `${script.id}-thumb.jpg`);
    generateThumbnail(finalPath, thumbPath);
    
    console.log(`\n✅ Done! Output: ${finalPath}\n`);
    
  } finally {
    // Cleanup
    if (server) {
      server.kill();
    }
  }
}

main().catch(console.error);
