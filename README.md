# Hegel IDE

Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

## Vision

**Two-panel layout:**
- **Right panel**: Integrated terminal running Claude Code (AI pair programming)
- **Left panel**: Markdown browser/viewer with no-code review system (document-driven workflow)

The terminal work is foundational but "off-vision" - the left panel (Markdown + review) is the primary differentiator.

## Current Status

Basic Electron shell with integrated terminal. Alpine.js for lightweight UI reactivity.

## Setup

```bash
npm install
npx electron-rebuild  # Required after install for native modules
npm start
npm test              # Run Playwright E2E tests
```

## Architecture

- **Electron**: Cross-platform app shell
- **Alpine.js**: Lightweight reactive UI (CDN-loaded, no build step)
- **xterm.js (@xterm/xterm)**: Terminal emulator
- **node-pty**: Bash process spawning and I/O
- **IPC**: Simple send/receive for terminal communication (nodeIntegration enabled, contextIsolation disabled)
- **Playwright**: E2E testing for Electron apps

## Current Features

- **Split-pane layout**: Draggable divider between left panel (markdown browser) and right panel (terminal)
- **Project discovery**: Left panel shows discovered Hegel projects via `hegel pm discover`
- **Terminal**: Functional bash terminal with xterm.js in right panel
- **State persistence**: Split position saved to localStorage
- **IPC integration**: Renderer ↔ main process communication for terminal and hegel CLI
- **E2E test suite**: 14 tests covering layout, terminal, and app launch (~16s execution time)

## Code Structure

```
hegel-ide/
├── index.html              Application entry point with split-pane layout
├── main.js                 Electron main process (window, IPC, hegel CLI integration)
├── renderer.js             Alpine.js component and terminal initialization
├── playwright.config.js    Playwright test configuration
│
├── e2e/                    Playwright E2E tests
│   ├── app.spec.js         App launch and window content tests
│   ├── split-pane.spec.js  Split-pane layout and drag functionality tests
│   ├── terminal.spec.js    Terminal presence and I/O tests
│   ├── smoke.spec.js       Basic smoke test
│   └── alpine.spec.js.bak  Archived Alpine reactivity test (test component removed)
│
├── .ddd/                   Document-Driven Development artifacts
│   ├── toys/               Discovery mode experiments (toy1: terminal, toy2: playwright)
│   └── feat/               Execution mode feature specs and plans
│       └── split_pane_layout/
│
├── ARCHITECTURE.md         Technology stack and architectural decisions
├── VISION.md               Product vision and target users
├── CLAUDE.md               AI agent instructions for working on this project
└── README.md               This file
```

## Testing

- **Playwright E2E tests**: 14 tests covering app launch, split-pane layout, terminal presence and I/O
- **Test execution**: ~16 seconds, runs via `npm test`
- **Coverage**: ~90% of current functionality (integration points validated)

## Known Limitations

- Native modules require `@electron/rebuild` after npm install (Electron uses NODE_MODULE_VERSION 140)
- Security model uses insecure IPC (acceptable for internal tool, revisit for distribution)
- Advanced terminal features not tested (Ctrl+C interruption, command history - manual verification acceptable)

## Dependencies

- `electron` - Application platform
- `@xterm/xterm`, `@xterm/addon-fit` - Terminal UI
- `node-pty` - Pseudoterminal for bash
- `alpinejs` - Loaded via CDN
- `@playwright/test` - E2E testing framework
- `@electron/rebuild` - Native module compilation for Electron

## License

SSPL
