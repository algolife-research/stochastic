/**
 * Render Final Tutorial Video
 * 
 * Combines:
 * - Recorded video
 * - Generated voiceover
 * - Visual annotations
 * 
 * Usage:
 *   npx tsx scripts/tutorial-video/render.ts my-tutorial
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { RecordedTutorial } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../../dist/tutorials');
const TEMP_DIR = path.join(__dirname, '../../temp/tutorial-gen');

async function generateVoiceover(text: string, outputPath: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set, creating silent audio');
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
      voice: 'nova', // Use nova for tutorials - clear and friendly
      input: text,
      response_format: 'mp3',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`TTS API error: ${response.status}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function renderTutorial(tutorialId: string) {
  console.log(`\n🎬 Rendering tutorial: ${tutorialId}`);
  console.log('━'.repeat(60));
  
  // Import tutorial script
  const scriptPath = path.join(__dirname, 'scripts', `${tutorialId}.ts`);
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Tutorial script not found: ${scriptPath}`);
    console.error('   Run: npx tsx scripts/tutorial-video/narrate.ts ' + tutorialId);
    process.exit(1);
  }
  
  const { [tutorialId.replace(/-/g, '_')]: tutorial } = await import(`./scripts/${tutorialId}.ts`);
  const recordingPath = path.resolve(__dirname, tutorial.recordingPath);
  
  if (!fs.existsSync(recordingPath)) {
    console.error(`❌ Recording not found: ${recordingPath}`);
    process.exit(1);
  }
  
  // Setup directories
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  
  console.log(`\n📹 Source: ${recordingPath}`);
  console.log(`📖 Chapters: ${tutorial.chapters.length}`);
  
  // Generate voiceovers for each chapter
  console.log('\n🎙️  Generating voiceovers...');
  const audioFiles: string[] = [];
  
  for (let i = 0; i < tutorial.chapters.length; i++) {
    const chapter = tutorial.chapters[i];
    const audioPath = path.join(TEMP_DIR, `chapter-${i}.mp3`);
    
    process.stdout.write(`  Chapter ${i + 1}/${tutorial.chapters.length}... `);
    await generateVoiceover(chapter.narration, audioPath);
    audioFiles.push(audioPath);
    console.log('✓');
  }
  
  // Create audio concat file
  const concatListPath = path.join(TEMP_DIR, 'audio-concat.txt');
  const concatContent = audioFiles.map(f => `file '${f}'`).join('\n');
  fs.writeFileSync(concatListPath, concatContent);
  
  // Combine audio files
  console.log('\n🎵 Combining audio...');
  const combinedAudioPath = path.join(TEMP_DIR, 'narration.mp3');
  execSync(
    `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${combinedAudioPath}"`,
    { stdio: 'pipe' }
  );
  
  // Merge video + audio
  console.log('🎬 Rendering final video...');
  const outputPath = path.join(OUTPUT_DIR, `${tutorialId}.mp4`);
  
  execSync(
    `ffmpeg -i "${recordingPath}" -i "${combinedAudioPath}" ` +
    `-c:v libx264 -preset medium -crf 23 ` +
    `-c:a aac -b:a 128k ` +
    `-shortest ` +
    `-y "${outputPath}"`,
    { stdio: 'inherit' }
  );
  
  console.log('\n✅ Video rendered successfully!');
  console.log(`  Output: ${outputPath}`);
  
  // Get file size
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`  Size: ${sizeMB} MB\n`);
}

// ============================================================================
// Main
// ============================================================================

const tutorialId = process.argv[2];

if (!tutorialId) {
  console.error('Usage: npx tsx scripts/tutorial-video/render.ts <tutorial-id>');
  process.exit(1);
}

renderTutorial(tutorialId).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
