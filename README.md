# Hegel IDE

Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

## Vision

**Two-panel layout:**
- **Right panel**: Integrated terminal running Claude Code (AI pair programming)
- **Left panel**: Markdown browser/viewer with no-code review system (document-driven workflow)

The terminal work is foundational but "off-vision" - the left panel (Markdown + review) is the primary differentiator.

## Current Status

Split-pane Electron application with tab-based interface. Left panel supports Projects list tab plus closeable project detail tabs with markdown rendering and link navigation. Right panel supports multiple independent terminal sessions in tabs. Alpine.js handles reactive state and localStorage persistence. Markdown browser Phase 1 complete (README.md rendering with theme support). Link navigation allows browsing between markdown files with tab management. Application-wide theming system with auto/dark/light/synthwave modes.

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
- **Markdown rendering**: README.md files rendered with theme-aware styling
- **Markdown link navigation**: Click markdown links to navigate between files in tab system (regular click navigates, Cmd+click opens new tab)
- **Theme system**: Application-wide theming with auto/dark/light/synthwave modes, localStorage persistence, system preference tracking
- **Multi-terminal**: Right panel supports multiple independent bash sessions in separate tabs
- **Terminal 1**: Non-closeable default terminal, additional terminals are closeable
- **Data caching**: Project details cached with refresh button for fresh data
- **State persistence**: Split position and theme preference saved to localStorage
- **Multi-terminal IPC**: Renderer ↔ main process communication routes I/O by terminalId
- **E2E test suite**: 33 tests covering tabs, terminals, projects, markdown rendering, themes, and layout (~40s execution time)

## Usage

**Left Panel - Project Tabs:**
- Projects tab (non-closeable) displays discovered Hegel projects
- Click any project name to open a detail tab showing JSON metrics and README.md (if present)
- README.md rendered as HTML with theme-aware styling (responds to system dark/light mode)
- Click markdown links to navigate: regular click navigates current tab, Cmd/Ctrl+click opens new tab
- Same file can only be open once (clicking link to already-open file switches to that tab)
- External links (http://, https://) open in system browser
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

**Theme System:**
- Theme dropdown in Projects tab header (left of "Toggle DevTools" button)
- Four themes available: Auto (system preference), Dark, Light, Synthwave
- Auto mode dynamically tracks system dark/light preference changes
- Theme selection persists across app restarts
- Synthwave theme features vibrant 80s-inspired colors and gradient effects

## Code Structure

```
hegel-ide/
├── index.html              Application entry point with split-pane layout
├── styles.css              All application CSS (extracted for modularity)
├── main.js                 Electron main process (window, terminals, file reading, hegel CLI)
├── playwright.config.js    Playwright test configuration
│
├── lib/                    Frontend modules (Alpine.js components)
│   └── See lib/README.md
│
├── e2e/                    Playwright E2E tests
│   └── See e2e/README.md
│
├── .ddd/                   Document-Driven Development artifacts
│   ├── toys/               Discovery mode experiments (toy1: terminal, toy2: playwright)
│   └── feat/               Execution mode feature specs and plans
│       ├── markdown_links/            Markdown link navigation with tab management
│       ├── project_readme_render/    Markdown browser Phase 1
│       ├── split_pane_layout/
│       ├── ui_tabs/
│       └── ui_themes/
│
├── ARCHITECTURE.md         Technology stack and architectural decisions
├── VISION.md               Product vision and target users
├── CLAUDE.md               AI agent instructions for working on this project
└── README.md               This file
```

## Testing

- **Playwright E2E tests**: 33 tests covering tabs, terminals, projects, markdown rendering, themes, split-pane, and app launch
- **Vitest unit tests**: 41 tests covering frontend modules (split-pane, tabs, terminals, projects, markdown, themes)
- **Test execution**: E2E ~40 seconds via `npm test`, unit tests <1 second via `npm run test:unit`
- **Test organization**: Shared timeout constants in test-constants.js for consistency
- **Coverage**: ~90% of current functionality (tab operations, multi-terminal, project details, README rendering, theme system)

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
