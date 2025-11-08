# Hegel IDE

Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

## Vision

**Two-panel layout:**
- **Right panel**: Integrated terminal running Claude Code (AI pair programming)
- **Left panel**: Markdown browser/viewer with no-code review system (document-driven workflow)

The terminal work is foundational but "off-vision" - the left panel (Markdown + review) is the primary differentiator.

## Current Status

Split-pane Electron application with tab-based interface. Left panel supports Projects list tab plus closeable project detail tabs with markdown rendering. Right panel supports multiple independent terminal sessions in tabs. Alpine.js handles reactive state and localStorage persistence. Markdown browser Phase 1 complete (README.md rendering with theme support).

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
- **marked**: Markdown-to-HTML conversion with GFM support
- **xterm.js (@xterm/xterm)**: Terminal emulator
- **node-pty**: Bash process spawning and I/O
- **IPC**: Simple send/receive for terminal/file communication (nodeIntegration enabled, contextIsolation disabled)
- **Playwright**: E2E testing for Electron apps

## Current Features

- **Split-pane layout**: Draggable divider between left panel (markdown browser) and right panel (terminals)
- **Tab system**: Each panel supports multiple tabs with add/close functionality
- **Project discovery**: Left panel Projects tab shows discovered Hegel projects via `hegel pm discover list`
- **Project details**: Click projects to open detail tabs showing metrics and README.md content
- **Markdown rendering**: README.md files rendered with theme-aware styling (dark/light mode via system preference)
- **Multi-terminal**: Right panel supports multiple independent bash sessions in separate tabs
- **Terminal 1**: Non-closeable default terminal, additional terminals are closeable
- **Data caching**: Project details cached with refresh button for fresh data
- **State persistence**: Split position saved to localStorage
- **Multi-terminal IPC**: Renderer ↔ main process communication routes I/O by terminalId
- **E2E test suite**: 28 tests covering tabs, terminals, projects, markdown rendering, and layout (~40s execution time)

## Usage

**Left Panel - Project Tabs:**
- Projects tab (non-closeable) displays discovered Hegel projects
- Click any project name to open a detail tab showing JSON metrics and README.md (if present)
- README.md rendered as HTML with theme-aware styling (responds to system dark/light mode)
- Missing README.md shows "Project missing README.md" message below metrics
- Project detail tabs include "Refresh" button to fetch fresh data (both metrics and README)
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
├── index.html              Application entry point with split-pane layout and markdown rendering
├── main.js                 Electron main process (window, terminals, file reading, hegel CLI)
├── renderer.js             Alpine.js state management, tabs, markdown rendering
├── playwright.config.js    Playwright test configuration
│
├── e2e/                    Playwright E2E tests
│   └── See e2e/README.md
│
├── .ddd/                   Document-Driven Development artifacts
│   ├── toys/               Discovery mode experiments (toy1: terminal, toy2: playwright)
│   └── feat/               Execution mode feature specs and plans
│       ├── project_readme_render/    Markdown browser Phase 1
│       ├── split_pane_layout/
│       └── ui_tabs/
│
├── ARCHITECTURE.md         Technology stack and architectural decisions
├── VISION.md               Product vision and target users
├── CLAUDE.md               AI agent instructions for working on this project
└── README.md               This file
```

## Testing

- **Playwright E2E tests**: 28 tests covering tabs, terminals, projects, markdown rendering, split-pane, and app launch
- **Test execution**: ~40 seconds, runs via `npm test`
- **Test organization**: Shared timeout constants in test-constants.js for consistency
- **Coverage**: ~90% of current functionality (tab operations, multi-terminal, project details, README rendering)

## Known Limitations

- Native modules require `@electron/rebuild` after npm install (Electron uses NODE_MODULE_VERSION 140)
- Security model uses insecure IPC (acceptable for internal tool, revisit for distribution)
- Advanced terminal features not tested (Ctrl+C interruption, command history - manual verification acceptable)

## Dependencies

- `electron` - Application platform
- `@xterm/xterm`, `@xterm/addon-fit` - Terminal UI
- `node-pty` - Pseudoterminal for bash
- `marked` - Markdown to HTML conversion
- `alpinejs` - Loaded via CDN
- `@playwright/test` - E2E testing framework
- `@electron/rebuild` - Native module compilation for Electron

## License

SSPL
