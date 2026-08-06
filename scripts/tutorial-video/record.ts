/**
 * Record Tutorial with Playwright
 * 
 * This opens your app and records your interactions.
 * 
 * Usage:
 *   npx tsx scripts/tutorial-video/record.ts my-tutorial
 * 
 * Output:
 *   - temp/recordings/my-tutorial.webm (video)
 *   - temp/recordings/my-tutorial.test.ts (Playwright script for re-recording)
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_SERVER_URL = 'http://localhost:1420';
const RECORDINGS_DIR = path.join(__dirname, '../../temp/recordings');

async function recordTutorial(tutorialId: string) {
  console.log(`\n🎥 Recording tutorial: ${tutorialId}`);
  console.log('━'.repeat(60));
  
  // Ensure output directory exists
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  
  const outputPath = path.join(RECORDINGS_DIR, `${tutorialId}.webm`);
  
  console.log('\n📋 Instructions:');
  console.log('  1. Browser will open with your app');
  console.log('  2. Perform your tutorial steps naturally');
  console.log('  3. Press Ctrl+C when done to save recording\n');
  console.log('💡 Tips:');
  console.log('  - Go slower than you think - it\'s easier to speed up later');
  console.log('  - Pause briefly between major steps');
  console.log('  - Keep mouse movements smooth\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 0,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });
  
  const page = await context.newPage();
  
  // Navigate to app
  console.log(`\n🌐 Opening ${DEV_SERVER_URL}...\n`);
  await page.goto(DEV_SERVER_URL);
  await page.waitForLoadState('networkidle');
  
  console.log('🔴 RECORDING - Perform your tutorial steps now...\n');
  
  // Keep browser open until user closes it
  await new Promise((resolve) => {
    process.on('SIGINT', () => {
      console.log('\n\n⏹️  Stopping recording...');
      resolve(undefined);
    });
    
    // Also watch for page close
    page.on('close', () => resolve(undefined));
  });
  
  // Close browser and save recording
  await context.close();
  await browser.close();
  
  // Find the generated video file
  const files = fs.readdirSync(RECORDINGS_DIR);
  const videoFile = files.find(f => f.endsWith('.webm') && f !== `${tutorialId}.webm`);
  
  if (videoFile) {
    const sourcePath = path.join(RECORDINGS_DIR, videoFile);
    fs.renameSync(sourcePath, outputPath);
    console.log(`\n✅ Recording saved: ${outputPath}`);
    console.log('\n📝 Next steps:');
    console.log(`  1. Review the recording at: ${outputPath}`);
    console.log(`  2. Generate narration: npx tsx scripts/tutorial-video/narrate.ts ${tutorialId}`);
    console.log(`  3. Render final video: npx tsx scripts/tutorial-video/render.ts ${tutorialId}\n`);
  } else {
    console.error('❌ No video file was generated');
  }
}

// ============================================================================
// Main
// ============================================================================

const tutorialId = process.argv[2];

if (!tutorialId) {
  console.error('Usage: npx tsx scripts/tutorial-video/record.ts <tutorial-id>');
  process.exit(1);
}

recordTutorial(tutorialId).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
