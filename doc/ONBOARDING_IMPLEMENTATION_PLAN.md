# Stochastic User Onboarding Implementation Plan

## Overview

This document outlines a comprehensive onboarding system to help new users learn Stochastic, from making their first sound to creating complex generative compositions. The plan is organized into progressive phases, from simple quick-wins to advanced interactive systems.

---

## Design Principles

1. **Progressive Disclosure** - Reveal complexity gradually, not all at once
2. **Learn by Doing** - Hands-on interaction beats reading documentation
3. **Immediate Feedback** - Every action should produce visible/audible results
4. **Safe Exploration** - Users should feel safe to experiment without breaking things
5. **Multiple Learning Paths** - Support different learning styles (guided, exploratory, reference)

---

## Phase 1: First-Run Experience (Simple - 1 week)

### 1.1 Welcome Modal for First-Time Users

**Goal:** Orient new users and set expectations within 30 seconds.

```
┌─────────────────────────────────────────────────────┐
│  🎵 Welcome to Stochastic                           │
│                                                     │
│  Create generative music through node-based         │
│  composition. Connect nodes, add randomness,        │
│  and let your music evolve.                         │
│                                                     │
│  ┌─────────────────┐  ┌──────────────────┐         │
│  │ 🎯 Quick Start  │  │ 📖 Load Tutorial │         │
│  │ (30 sec intro)  │  │ (10 lessons)     │         │
│  └─────────────────┘  └──────────────────┘         │
│                                                     │
│  ┌─────────────────┐  ┌──────────────────┐         │
│  │ 🔬 Explore      │  │ 📂 Open Example  │         │
│  │ (blank canvas)  │  │ (community)      │         │
│  └─────────────────┘  └──────────────────┘         │
│                                                     │
│  [ ] Don't show this again                          │
└─────────────────────────────────────────────────────┘
```

**Implementation:**
- New component: `src/ui/WelcomeModal.tsx`
- Store flag in localStorage: `stochastic_has_onboarded`
- Trigger on first load when no project is open

### 1.2 Quick Start Flow (30-Second Guided Setup)

**Goal:** Get the user to hear sound within 30 seconds.

**Steps:**
1. "Right-click to add a **Source** node" (highlight canvas, show context menu)
2. "Right-click to add a **Speaker** node" (position suggestion)
3. "Click and drag from Source to Speaker to connect" (show edge preview)
4. "Press **Space** to play!" (highlight transport)
5. 🎉 "You made your first generative sound!"

**Implementation:**
- Component: `src/ui/QuickStartOverlay.tsx`
- State machine tracking progress through steps
- Spotlight/highlight system for UI elements
- Completion triggers confetti or celebratory feedback

### 1.3 Keyboard Shortcut Hints

**Goal:** Teach shortcuts in context without overwhelming.

Show floating hints when relevant actions are performed with mouse:
- User deletes node with context menu → "💡 Tip: Press **Delete** to remove selected nodes"
- User pans with scroll → "💡 Tip: Hold **Space** and drag to pan"
- User copies node via menu → "💡 Tip: **Ctrl+C/V** to copy/paste nodes"

**Implementation:**
- Component: `src/ui/ShortcutHint.tsx`
- Track which hints have been shown (localStorage)
- Max 1 hint per session, dismissable
- Configurable in settings to disable

---

## Phase 2: Interactive Tutorials (Medium - 2-3 weeks)

### 2.1 Tutorial System Architecture

**Goal:** Structured lessons that guide users through concepts step-by-step.

```typescript
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  // What the user needs to do
  action: 'create-node' | 'connect' | 'modify-property' | 'play' | 'navigate-scene';
  actionTarget?: {
    nodeType?: NodeType;
    property?: string;
    value?: any;
  };
  // UI guidance
  highlight?: {
    element: 'canvas' | 'property-panel' | 'scene-panel' | 'transport' | string;
    position?: { x: number; y: number };
  };
  // Validation
  validate: (state: GraphState) => boolean;
  // Advancement
  autoAdvance?: boolean;
  nextDelay?: number;
}

interface Tutorial {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  steps: TutorialStep[];
  // Pre-loaded canvas state
  initialState?: Partial<GraphState>;
}
```

### 2.2 Beginner Tutorial Series

#### Tutorial 1: Your First Sound (5 min)
1. Create a Source node
2. Create a Speaker node
3. Connect them
4. Press play
5. Adjust Source interval
6. Adjust Speaker reverb

#### Tutorial 2: Shaping Sound (5 min)
1. Add an Oscillator between Source and Speaker
2. Change waveform types (hear the difference)
3. Adjust attack/decay
4. Add a second Oscillator for layering

#### Tutorial 3: Adding Pitch (5 min)
1. Add a Pitch node to transpose
2. Branch the path for chords
3. Understand the scale system
4. Use the musical context panel

#### Tutorial 4: Introducing Randomness (7 min)
1. Add a Gate node with probability
2. Hear notes appearing/disappearing
3. Set Source note to "Random in scale"
4. Explore probability vs. fitness modes

#### Tutorial 5: Working with Filters (5 min)
1. Add a Filter node
2. Understand cutoff frequency
3. Apply filter envelope modulation
4. Combine with oscillator for classic synth sound

### 2.3 Intermediate Tutorial Series

#### Tutorial 6: Delays and Echoes (8 min)
- Delay node timing (physical vs fixed)
- Creating rhythmic patterns with delays
- Feedback loops (with warnings about safety)

#### Tutorial 7: LFO Modulation (10 min)
- Connect LFO to control parameters
- Modulation targets and ranges
- Creating movement and expression

#### Tutorial 8: Scenes and Arrangement (10 min)
- Creating multiple scenes
- Scene transitions
- Building a song structure
- Arrangement timeline

#### Tutorial 9: Tunnels and Groups (10 min)
- Grouping nodes into Tunnels
- Sub-node routing
- Managing complexity

#### Tutorial 10: Quantizers and Rhythm (10 min)
- Euclidean rhythm generator
- Quantizing to the beat
- Polyrhythmic patterns

### 2.4 Advanced Concepts

#### Tutorial 11: Genetic Evolution
- Crossover and mutation nodes
- Fitness-based selection
- Evolving compositions over time

#### Tutorial 12: AI-Assisted Composition
- Using the AI panel
- Prompt engineering for music
- Iterating with AI suggestions

### 2.5 Tutorial UI Components

**Tutorial Sidebar:**
```
┌──────────────────────────┐
│ 📚 Tutorial: First Sound │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Step 3 of 6              │
│ [████████░░░░░░░] 50%    │
│                          │
│ Connect the nodes        │
│ ─────────────────────    │
│ Click and drag from the  │
│ Source to the Speaker    │
│ to create a connection.  │
│                          │
│ 💡 Connections carry     │
│ packets from one node    │
│ to another.              │
│                          │
│ [← Back] [Skip] [→]      │
└──────────────────────────┘
```

**Implementation:**
- Component: `src/ui/TutorialPanel.tsx`
- Store: `src/tutorial/store.ts`
- Tutorial definitions: `src/tutorial/tutorials/`
- Progress persisted in localStorage

---

## Phase 3: Contextual Help System (Medium - 2 weeks)

### 3.1 Tooltip Enhancements

**Goal:** Rich, contextual tooltips for every interactive element.

Current tooltips are basic. Enhance with:
- Brief description + keyboard shortcut
- Mini-example where relevant
- "Learn more" link to docs

Example for Gate node:
```
┌───────────────────────────────────┐
│ 🚦 Gate                           │
│ Controls which packets pass       │
│ through based on probability      │
│ or fitness criteria.              │
│                                   │
│ 💡 Try setting probability to     │
│ 0.5 for coin-flip randomness.     │
│                                   │
│ [📖 Learn More]                   │
└───────────────────────────────────┘
```

### 3.2 Property Panel Help

Add inline help to the PropertyPanel:
- Hover icons (?) next to each property
- Expandable explanation sections
- Visual range indicators for numeric values

### 3.3 AI Assistant Awareness

The AI panel (`Iannis`) should be onboarding-aware:
- Detect when user is stuck (no changes for 30+ seconds)
- Offer contextual suggestions: "Would you like me to add a speaker to hear your sound?"
- Provide learning prompts: "Try asking me to 'make it more rhythmic'"

---

## Phase 4: Sandbox & Playground Mode (Medium - 2 weeks)

### 4.1 Sandbox Environment

**Goal:** Safe space to experiment without fear of breaking things.

Features:
- Isolated from main project
- Pre-populated with nodes to explore
- Undo/redo with visual history
- Reset button to restore initial state
- No save prompts

**Implementation:**
- Flag in store: `isSandboxMode`
- Sandbox-specific initial state
- Different toolbar options (Reset, Exit Sandbox)

### 4.2 Node Playground

Interactive node explorer:
- Grid of all node types with play buttons
- Click to hear what each node sounds like in isolation
- Visual representation of signal flow
- Compare similar nodes side-by-side

```
┌─────────────────────────────────────────────────┐
│ 🎛️ Node Playground                              │
│ ─────────────────────────────────────────────── │
│                                                 │
│ SOURCES          MODIFIERS         OUTPUTS      │
│ ┌─────────┐      ┌─────────┐      ┌─────────┐  │
│ │ 🎵      │      │ 🎹      │      │ 🔈      │  │
│ │ Source  │ ──▶  │ Pitch   │ ──▶  │ Speaker │  │
│ │ [▶ Play]│      │ [+7]    │      │ [▶]     │  │
│ └─────────┘      └─────────┘      └─────────┘  │
│                                                 │
│ Tap any node to learn more and hear examples   │
└─────────────────────────────────────────────────┘
```

### 4.3 Preset Patterns

One-click patterns to jumpstart composition:
- "Basic Beat" - Kick + snare pattern
- "Arpeggiator" - Source → Delay chain → Speaker
- "Pad Drone" - Long attack, multiple oscillators
- "Random Melody" - Gate-filtered random notes
- "Call & Response" - Two sources with probability

---

## Phase 5: Challenge System (Complex - 3-4 weeks)

### 5.1 Composition Challenges

Gamified learning objectives:

**Beginner Challenges:**
- ✅ Create your first sound
- ✅ Add reverb to a speaker
- ✅ Use a pitch shifter
- ✅ Make a chord (3+ simultaneous notes)
- ✅ Use randomness with a Gate

**Intermediate Challenges:**
- ✅ Create a 4-beat loop
- ✅ Build a multi-scene composition
- ✅ Use LFO modulation
- ✅ Create polyrhythm with different intervals
- ✅ Apply a filter envelope

**Advanced Challenges:**
- ✅ Use Euclidean rhythms
- ✅ Create an evolving texture with genetics
- ✅ Build a complete song with intro/verse/chorus
- ✅ Export a composition to WAV

### 5.2 Challenge UI

```
┌────────────────────────────────────────┐
│ 🏆 Challenges                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                        │
│ Beginner (3/5 completed)               │
│ ─────────────────────────              │
│ ✅ Create your first sound             │
│ ✅ Add reverb                          │
│ ✅ Use pitch shifting                  │
│ ⬜ Make a chord                        │
│ ⬜ Use randomness                      │
│                                        │
│ ────────────────────────               │
│ Reward: 🎨 Unlock "Ocean" theme        │
│                                        │
│ [View Details] [Start Challenge]       │
└────────────────────────────────────────┘
```

### 5.3 Progress Tracking

- Persistent challenge progress
- Visual progress indicators
- Optional rewards (themes, templates, badges)
- Shareable achievements

---

## Phase 6: Template Gallery (Simple - 1 week)

### 6.1 Starter Templates

Pre-configured compositions to build from:

| Template | Description | Complexity |
|----------|-------------|------------|
| Minimal Drone | Single oscillator with long decay | ⭐ |
| Basic Beat | Kick + hi-hat + snare pattern | ⭐ |
| Simple Melody | Random notes in scale | ⭐ |
| Chord Pad | Three-note chord with reverb | ⭐⭐ |
| Arpeggio | Delayed note cascade | ⭐⭐ |
| Filter Bass | Saw + filter envelope | ⭐⭐ |
| Polyrhythm | Multiple intervals interleaving | ⭐⭐⭐ |
| Generative Ambient | LFOs + probability gates | ⭐⭐⭐ |
| Techno Loop | Multi-scene dance track | ⭐⭐⭐⭐ |

### 6.2 Template Browser

```
┌─────────────────────────────────────────────────────┐
│ 📦 Start from Template                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                     │
│ [🔍 Search...]                [⭐ All] [⭐⭐] [⭐⭐⭐] │
│                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ 🎵           │ │ 🥁           │ │ 🎹           │ │
│ │ Minimal      │ │ Basic        │ │ Simple       │ │
│ │ Drone        │ │ Beat         │ │ Melody       │ │
│ │ ⭐           │ │ ⭐           │ │ ⭐           │ │
│ │ [Preview][+] │ │ [Preview][+] │ │ [Preview][+] │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ 🎻           │ │ 🎛️           │ │ 🔊           │ │
│ │ Chord        │ │ Filter       │ │ Arpeggio     │ │
│ │ Pad          │ │ Bass         │ │              │ │
│ │ ⭐⭐         │ │ ⭐⭐         │ │ ⭐⭐         │ │
│ │ [Preview][+] │ │ [Preview][+] │ │ [Preview][+] │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Phase 7: In-App Documentation (Medium - 2 weeks)

### 7.1 Enhance Existing DocsPanel

Current `DocsPanel.tsx` provides reference documentation. Enhance with:

- **Search functionality** - Find nodes/concepts quickly
- **Bookmarks** - Save frequently referenced sections
- **Interactive examples** - "Try it" buttons that load mini-examples
- **Video embeds** - Short clips demonstrating concepts

### 7.2 Contextual Help (F1 / ? Key)

Press `F1` or `?` anywhere to get help for current context:
- Node selected → Show node documentation
- Property panel open → Explain current properties
- Scene panel focused → Scene management help
- Nothing selected → General overview

### 7.3 Glossary Panel

Define musical and technical terms:
- **Packet** - A musical event traveling through nodes
- **Oscillator** - Waveform generator that creates timbre
- **Gate** - Filter that probabilistically blocks packets
- **Scene** - A self-contained section of a composition
- **Tunnel** - A grouped set of nodes

---

## Phase 8: Video Content Integration (Medium - 2 weeks)

### 8.1 Video Tutorial Library

Embedded video tutorials accessible from Help menu:

| Video | Duration | Level |
|-------|----------|-------|
| Getting Started with Stochastic | 5 min | Beginner |
| Understanding Node Flow | 3 min | Beginner |
| Creating Your First Beat | 7 min | Beginner |
| Working with Scenes | 8 min | Intermediate |
| Advanced Routing with Tunnels | 10 min | Advanced |
| Generative Techniques | 12 min | Advanced |

### 8.2 Feature Spotlights

Short (30-60 second) videos highlighting specific features:
- "Did you know?" micro-tutorials
- New feature announcements
- Tips & tricks series

---

## Implementation Priority

### Immediate (Week 1-2)
1. ✅ Welcome Modal for first-time users
2. ✅ Quick Start 30-second flow
3. ✅ Basic keyboard shortcut hints

### Short-term (Week 3-6)
4. Tutorial System architecture
5. Beginner Tutorial Series (6 tutorials)
6. Enhanced tooltips

### Medium-term (Week 7-12)
7. Intermediate tutorials
8. Sandbox/Playground mode
9. Template Gallery
10. Contextual help (F1)

### Long-term (Week 13+)
11. Challenge system with progress tracking
12. Video content integration
13. Advanced tutorials
14. Community tutorial contributions

---

## Technical Architecture

### New Components

```
src/
├── onboarding/
│   ├── index.ts
│   ├── store.ts              # Onboarding state (Zustand)
│   ├── types.ts              # Tutorial/Challenge types
│   └── tutorials/
│       ├── first-sound.ts
│       ├── shaping-sound.ts
│       └── ...
├── ui/
│   ├── WelcomeModal.tsx
│   ├── QuickStartOverlay.tsx
│   ├── TutorialPanel.tsx
│   ├── ShortcutHint.tsx
│   ├── ChallengePanel.tsx
│   ├── TemplateGallery.tsx
│   ├── NodePlayground.tsx
│   └── Spotlight.tsx         # UI element highlighting
```

### State Management

```typescript
interface OnboardingState {
  // First-run
  hasCompletedWelcome: boolean;
  hasCompletedQuickStart: boolean;
  
  // Tutorials
  currentTutorial: string | null;
  currentStep: number;
  completedTutorials: string[];
  
  // Challenges
  completedChallenges: string[];
  challengeProgress: Record<string, number>;
  
  // Hints
  shownHints: string[];
  hintsEnabled: boolean;
  
  // Preferences
  showWelcomeOnStartup: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
}
```

### Persistence

All onboarding progress stored in localStorage:
```javascript
localStorage.getItem('stochastic_onboarding')
// { hasCompletedWelcome: true, completedTutorials: ['first-sound', ...], ... }
```

---

## Success Metrics

Track anonymously (opt-in):
- % of new users who complete Quick Start
- Average time to first sound
- Tutorial completion rates
- Challenge completion rates
- Feature discovery patterns
- Drop-off points in tutorials

---

## Accessibility Considerations

- All tutorials keyboard-navigable
- Screen reader support for step descriptions
- High contrast mode for highlights
- Adjustable hint timing
- Skip options for experienced users
- Closed captions for video content

---

## Future Enhancements

- **Community Tutorials** - User-submitted tutorials
- **Learning Paths** - Curated sequences (e.g., "Ambient Producer", "Beat Maker")
- **Mentorship Mode** - Connect beginners with experienced users
- **AI Tutor** - Iannis provides personalized guidance based on user history
- **Certification** - Badges for completing learning paths
