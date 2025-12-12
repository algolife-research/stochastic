# Stochastic

**Stochastic** is an Algorithmic Interactive Graph Audio application. It is a node-based generative music environment where you compose music by building geometric graphs.

In Stochastic, **Space is Time**. The distance between nodes determines the rhythm, and the topology of the graph determines the melody and texture.

## Features

- **Node-Based Composition:** Create complex musical structures using simple building blocks (Source, Splitter, Pitch, Speaker).
- **Generative Audio:** Real-time synthesis using the Web Audio API.
- **Project Management:** Save and load your compositions as local projects.
- **Export:** Render your generative sessions to high-quality WAV files.
- **Tunnels:** Encapsulate complex logic into reusable sub-graphs.
- **User Authentication:** Secure sign-up and sign-in with email verification via Supabase.
- **AI Features:** AI-powered music generation and assistance (requires credits).

## Development

Stochastic is built with **Tauri**, **React**, and **TypeScript**.

### Prerequisites

- Node.js (v16+)
- Rust (for Tauri)

### Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run in Development Mode:**
    ```bash
    npm run tauri:dev
    ```
    This will start the Vite dev server and launch the Tauri application window.

3.  **Build for Production:**
    ```bash
    npm run tauri:build
    ```
    The output executable will be in `src-tauri/target/release`.

## Documentation

- [Conceptual Framework](doc/CONCEPTUAL_FRAMEWORK.md)
- [Musical Model](doc/MUSICAL_MODEL.md)
- [Architecture](doc/ARCHITECTURE.md)
- [Roadmap](doc/ROADMAP.md)
- [User Authentication System](doc/USER_AUTH_SYSTEM.md)
- [Email Verification Setup](doc/EMAIL_VERIFICATION_SETUP.md)
- [Email Verification Implementation](doc/EMAIL_VERIFICATION_IMPLEMENTATION.md)
