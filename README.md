# Stochastic

**Stochastic** is a node-based generative music environment where you compose by building geometric graphs.

The core idea: **Space is Time**. Musical events (packets) travel along edges at constant speed, so the *distance* between nodes determines the rhythm, and the *topology* of the graph — how paths split, merge, and loop — determines the melody and texture. Moving a node re-times every path through it: arranging is composing.

## Features

- **Node-Based Composition** — build music from simple blocks: Source, Oscillator, Filter, Gate, Speaker, and 14 more node types
- **Generative Engine** — probability gates, quantizers, LFO/CV modulation, genetic mutators and crossover breeding
- **Real-Time Synthesis** — AudioWorklet-based synth with layered oscillators (additive/ring/FM), unison, filters, and noise
- **Scenes & Arrangement** — compose multi-scene pieces on a timeline, or improvise in Jam mode with scene triggers
- **Tunnels** — encapsulate processing chains into reusable instrument nodes
- **Examples Library** — 50+ compositions across tutorials, demos, synthesis, generative, and orchestral categories, plus full multi-scene pieces (the Dune suite and more). Fetched on demand and cached; only the tutorial and welcome demo are bundled, so onboarding works offline
- **Export** — render compositions to WAV, or capture visualization videos
- **Cloud Projects** — optional sign-in to save and sync projects (Supabase)
- **AI Assistant** — describe what you want and let the assistant build or modify the graph (requires credits)

## Getting Started

New here? Open the app, pick **Start the Tutorial** on the welcome screen, and press **Space**. Ten guided scenes take you from your first sound to advanced generative graphs. The in-app docs (📚 in the toolbar) cover every node type and shortcut.

## Development

Stochastic is built with **React**, **TypeScript**, and **Vite**, with an optional **Tauri** desktop build.

### Web (recommended for development)

```bash
npm install
npm run dev        # start the Vite dev server
```

### Quality checks

```bash
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run test:run   # Vitest (includes the example-library validation suite)
npm run build      # production build
```

### Example library

The examples menu is populated from a static library (`index.json` manifest +
per-example JSON + full `.sto` compositions), fetched lazily and cached in
localStorage. By default it is served from `public/examples-library/` next to
the app; set `VITE_EXAMPLES_BASE_URL` to host it elsewhere (e.g. a public
`stochastic-examples` repository's raw URL). Regenerate the manifest with:

```bash
npx tsx scripts/export-example-library.mjs
```

Fetched examples are validated (node types, prop names, edge integrity)
before they touch the project; the same rules run in the test suite.

### Desktop (Tauri)

Requires Rust.

```bash
npm run tauri:dev    # develop in a native window
npm run tauri:build  # produce a release executable in src-tauri/target/release
```

## Documentation

- [Conceptual Framework](doc/theory/CONCEPTUAL_FRAMEWORK.md) — the space-is-time model
- [Musical Model](doc/theory/MUSICAL_MODEL.md)
- [Architecture](doc/ARCHITECTURE.md) · [Frontend](doc/FRONTEND_ARCHITECTURE.md) · [Backend](doc/BACKEND_ARCHITECTURE.md)
- [Sound Synthesis](doc/SOUND_SYNTHESIS.md)
- [Scene System Design](doc/SCENE_SYSTEM_DESIGN.md)
- [Roadmap](doc/ROADMAP.md)
- [User Authentication System](doc/USER_AUTH_SYSTEM.md)
