# Hegel IDE

Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

## Vision

**Two-panel layout:**
- **Right panel**: Integrated terminal running Claude Code (AI pair programming)
- **Left panel**: Markdown browser/viewer with no-code review system (document-driven workflow)

The terminal work is foundational but "off-vision" - the left panel (Markdown + review) is the primary differentiator.

## Current Status

Split-pane Electron application with tab-based interface. Left panel supports Projects list tab plus closeable project detail tabs. Right panel supports multiple independent terminal sessions in tabs. Alpine.js handles reactive state and localStorage persistence.

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

- **Split-pane layout**: Draggable divider between left panel (markdown browser) and right panel (terminals)
- **Tab system**: Each panel supports multiple tabs with add/close functionality
- **Project discovery**: Left panel Projects tab shows discovered Hegel projects via `hegel pm discover list`
- **Project details**: Click projects to open detail tabs showing metrics via `hegel pm discover show`
- **Multi-terminal**: Right panel supports multiple independent bash sessions in separate tabs
- **Terminal 1**: Non-closeable default terminal, additional terminals are closeable
- **Data caching**: Project details cached with refresh button for fresh data
- **State persistence**: Split position saved to localStorage
- **Multi-terminal IPC**: Renderer ↔ main process communication routes I/O by terminalId
- **E2E test suite**: 25 tests covering tabs, terminals, projects, and layout (~30s execution time)

## Usage

**Left Panel - Project Tabs:**
- Projects tab (non-closeable) displays discovered Hegel projects
- Click any project name to open a detail tab showing metrics, workflow state, and activity
- Project detail tabs include "Refresh" button to fetch fresh data
- Click "×" on project tabs to close them
- Reopening a project uses cached data for instant display

**Right Panel - Terminal Tabs:**
- Terminal 1 (non-closeable) auto-launches on startup
- Click "+" button to create additional terminal tabs (Terminal 2, Terminal 3, etc.)
- Each terminal has independent bash session with separate command history
- Click "×" on additional terminals to close them (Terminal 1 cannot be closed)
- Click tab headers to switch between terminals

**Split Pane:**
- Drag divider to resize panels (saved to localStorage)
- Panel widths persist across app restarts

## Code Structure

```
hegel-ide/
├── index.html              Application entry point with tab-based split-pane layout
├── main.js                 Electron main process (window, multi-terminal IPC, hegel CLI)
├── renderer.js             Alpine.js tab management and multi-terminal initialization
├── playwright.config.js    Playwright test configuration
│
├── e2e/                    Playwright E2E tests
│   └── See e2e/README.md
│
├── .ddd/                   Document-Driven Development artifacts
│   ├── toys/               Discovery mode experiments (toy1: terminal, toy2: playwright)
│   └── feat/               Execution mode feature specs and plans
│       ├── split_pane_layout/
│       └── ui_tabs/
│
├── ARCHITECTURE.md         Technology stack and architectural decisions
├── VISION.md               Product vision and target users
├── CLAUDE.md               AI agent instructions for working on this project
└── README.md               This file
```

## Testing

- **Playwright E2E tests**: 25 tests covering tabs, terminals, projects, split-pane, and app launch
- **Test execution**: ~30 seconds, runs via `npm test`
- **Test organization**: Shared timeout constants in test-constants.js for consistency
- **Coverage**: ~90% of current functionality (tab operations, multi-terminal, project details)

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
