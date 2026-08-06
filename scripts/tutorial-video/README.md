# Tutorial Video Generator

Record tutorials with Playwright, then auto-generate narration and polish.

## 🎯 New Workflow (Recommended)

### 1. Install Dependencies

```bash
npm install playwright tsx
npx playwright install chromium
```

### 2. Install FFmpeg

**Windows (with Chocolatey):**
```bash
choco install ffmpeg
```

**Windows (with Scoop):**
```bash
scoop install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

### 3. Set up AI Narration

For AI-generated voiceovers, set your OpenAI API key:

```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."

# macOS/Linux
export OPENAI_API_KEY="sk-..."
```

### 4. Record Your Tutorial

Start your dev server first:

```bash
npm run tauri dev
```

Then in another terminal:

```bash
npx tsx scripts/tutorial-video/record.ts my-tutorial
```

This will:
- Open your app in a browser
- Start recording your screen
- Capture all your interactions

Perform your tutorial naturally, then press **Ctrl+C** when done.

### 5. Generate Narration

Auto-generate with AI:

```bash
npx tsx scripts/tutorial-video/narrate.ts my-tutorial
```

Or create manually:

```bash
npx tsx scripts/tutorial-video/narrate.ts my-tutorial --manual
```

This creates chapter timestamps and narration scripts.

### 6. Render Final Video

```bash
npx tsx scripts/tutorial-video/render.ts my-tutorial
```

Output: `dist/tutorials/my-tutorial.mp4`

## 📝 Editing Narration

The narration script is saved as `scripts/tutorial-video/scripts/my-tutorial.ts`:

```typescript
import type { RecordedTutorial } from '../types';

export const my_tutorial: RecordedTutorial = {
  id: 'my-tutorial',
  title: 'My Tutorial',
  description: 'Learn how to...',
  recordingPath: '../../temp/recordings/my-tutorial.webm',
  chapters: [
    {
      startTime: 0,
      duration: 5.0,
      narration: "Welcome! In this tutorial, we'll create your first sound.",
      annotations: [
        {
          time: 1.0,
          duration: 2.0,
          type: 'highlight',
          position: { x: 400, y: 300 },
          text: 'New Node Button'
        }
      ]
    },
    // More chapters...
  ],
};
```

Edit this file to refine narration, adjust timing, or add visual annotations.

Then re-render:

```bash
npx tsx scripts/tutorial-video/render.ts my-tutorial
```

---

## 🔧 Legacy Workflow (Script-Based)

The old script-based approach is still available for precise control.

## Creating New Tutorials

Create a new script file in `scripts/tutorial-video/scripts/`:

```typescript
// scripts/tutorial-video/scripts/my-tutorial.ts
import type { TutorialVideoScript } from '../types';

export const myTutorial: TutorialVideoScript = {
  id: 'my-tutorial',
  title: 'My Tutorial Title',
  description: 'What this tutorial teaches',
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  segments: [
    {
      narration: "What the voice will say",
      actions: [
        { type: 'wait', ms: 500 },
        { type: 'rightClick', x: 400, y: 300 },
        { type: 'selectContextMenu', item: 'Source' },
      ],
    },
    // More segments...
  ],
};
```

Then add it to `generate.ts`:

```typescript
import { myTutorial } from './scripts/my-tutorial';

const TUTORIALS: Record<string, TutorialVideoScript> = {
  'first-sound': firstSoundTutorial,
  'my-tutorial': myTutorial,  // Add here
};
```

## Available Actions

| Action | Description |
|--------|-------------|
| `wait` | Pause for specified milliseconds |
| `click` | Click on element by CSS selector |
| `rightClick` | Right-click at coordinates |
| `selectContextMenu` | Click item in context menu by text |
| `drag` | Drag from one point to another |
| `pressKey` | Press a keyboard key |
| `type` | Type text |
| `moveMouse` | Move mouse to coordinates |
| `highlight` | Highlight an element briefly |

## Tips

- Run with `headless: false` in generate.ts to see the browser
- Keep narration short and clear
- Add `pauseAfter` to give time between segments
- Test actions manually first to get coordinates
- Use the browser's DevTools to find selectors

## Batch Generation

Generate all tutorials at once:

```bash
npx tsx scripts/tutorial-video/generate-all.ts
```

## CI/CD Integration

See `.github/workflows/generate-tutorials.yml` for automated generation on push.
