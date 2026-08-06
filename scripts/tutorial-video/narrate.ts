/**
 * Auto-Generate Narration for Recorded Tutorial
 * 
 * Uses AI to analyze the recording and generate:
 * - Chapter timestamps
 * - Narration script
 * - Visual annotations
 * 
 * Usage:
 *   npx tsx scripts/tutorial-video/narrate.ts my-tutorial
 *   npx tsx scripts/tutorial-video/narrate.ts my-tutorial --manual  # Interactive mode
 * 
 * Requires:
 *   OPENAI_API_KEY environment variable
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';
import type { RecordedTutorial, TutorialChapter } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECORDINGS_DIR = path.join(__dirname, '../../temp/recordings');
const SCRIPTS_DIR = path.join(__dirname, './scripts');

interface VideoMetadata {
  duration: number;
  fps: number;
  width: number;
  height: number;
}

async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  // Use ffprobe to get video metadata
  const { execSync } = await import('child_process');
  const output = execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`
  ).toString();
  
  const data = JSON.parse(output);
  const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
  
  return {
    duration: parseFloat(data.format.duration),
    fps: eval(videoStream.r_frame_rate), // e.g., "30/1" -> 30
    width: videoStream.width,
    height: videoStream.height,
  };
}

async function generateNarrationAI(
  tutorialId: string,
  metadata: VideoMetadata
): Promise<TutorialChapter[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  
  console.log('\n🤖 Generating narration with AI...\n');
  
  // For now, we'll use GPT-4 to generate a structured script
  // In the future, could add vision analysis of video frames
  
  const prompt = `Generate a tutorial narration script for a ${metadata.duration.toFixed(1)}s video tutorial about using a stochastic music composition tool.

The video shows someone:
1. Creating their first sound
2. Connecting nodes
3. Playing the result

Generate a JSON array of chapters with this structure:
[
  {
    "startTime": 0,
    "duration": 5.0,
    "narration": "Welcome to your first tutorial...",
    "annotations": [
      {
        "time": 1.0,
        "duration": 2.0,
        "type": "highlight",
        "position": {"x": 400, "y": 300},
        "text": "New Node"
      }
    ]
  }
]

Keep narration conversational and concise. Each chapter should be 5-10 seconds.`;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a tutorial script writer. Generate engaging, clear narration.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  
  return content.chapters || [];
}

async function generateNarrationManual(
  tutorialId: string,
  metadata: VideoMetadata
): Promise<TutorialChapter[]> {
  console.log('\n📝 Manual Narration Mode');
  console.log('━'.repeat(60));
  console.log(`Video Duration: ${metadata.duration.toFixed(1)}s\n`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));
  
  const chapters: TutorialChapter[] = [];
  let currentTime = 0;
  
  while (currentTime < metadata.duration) {
    console.log(`\n📍 Chapter ${chapters.length + 1} (starts at ${currentTime.toFixed(1)}s)`);
    
    const duration = parseFloat(await question('  Duration (seconds): '));
    const narration = await question('  Narration text: ');
    
    chapters.push({
      startTime: currentTime,
      duration,
      narration,
    });
    
    currentTime += duration;
    
    if (currentTime < metadata.duration) {
      const more = await question('\n  Add another chapter? (y/n): ');
      if (more.toLowerCase() !== 'y') break;
    }
  }
  
  rl.close();
  return chapters;
}

async function generateNarration(tutorialId: string, manual: boolean = false) {
  console.log(`\n📖 Generating narration for: ${tutorialId}`);
  console.log('━'.repeat(60));
  
  const videoPath = path.join(RECORDINGS_DIR, `${tutorialId}.webm`);
  
  if (!fs.existsSync(videoPath)) {
    console.error(`❌ Recording not found: ${videoPath}`);
    console.error('   Run: npx tsx scripts/tutorial-video/record.ts ' + tutorialId);
    process.exit(1);
  }
  
  // Get video metadata
  console.log('\n📊 Analyzing video...');
  const metadata = await getVideoMetadata(videoPath);
  console.log(`  Duration: ${metadata.duration.toFixed(1)}s`);
  console.log(`  Resolution: ${metadata.width}x${metadata.height}`);
  console.log(`  FPS: ${metadata.fps}`);
  
  // Generate chapters
  const chapters = manual
    ? await generateNarrationManual(tutorialId, metadata)
    : await generateNarrationAI(tutorialId, metadata);
  
  // Create tutorial definition
  const tutorial: RecordedTutorial = {
    id: tutorialId,
    title: tutorialId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Auto-generated tutorial',
    recordingPath: `../../temp/recordings/${tutorialId}.webm`,
    chapters,
  };
  
  // Save to scripts directory
  const outputPath = path.join(SCRIPTS_DIR, `${tutorialId}.ts`);
  const content = `import type { RecordedTutorial } from '../types';

export const ${tutorialId.replace(/-/g, '_')}: RecordedTutorial = ${JSON.stringify(tutorial, null, 2)};
`;
  
  fs.writeFileSync(outputPath, content);
  
  console.log('\n✅ Narration script generated!');
  console.log(`  Saved to: ${outputPath}`);
  console.log(`\n📝 Chapters: ${chapters.length}`);
  chapters.forEach((ch, i) => {
    console.log(`  ${i + 1}. [${ch.startTime.toFixed(1)}s - ${(ch.startTime + ch.duration).toFixed(1)}s] ${ch.narration.substring(0, 50)}...`);
  });
  
  console.log('\n📝 Next step:');
  console.log(`  npx tsx scripts/tutorial-video/render.ts ${tutorialId}\n`);
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const tutorialId = args[0];
const manual = args.includes('--manual');

if (!tutorialId) {
  console.error('Usage: npx tsx scripts/tutorial-video/narrate.ts <tutorial-id> [--manual]');
  process.exit(1);
}

generateNarration(tutorialId, manual).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
