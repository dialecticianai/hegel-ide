# Hegel IDE

![Hegel](hegel.jpg)

Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

## Vision

**Two-panel layout:**
- **Right panel**: Integrated terminal running Claude Code (AI pair programming)
- **Left panel**: Markdown browser/viewer with no-code review system (document-driven workflow)

The terminal work is foundational but "off-vision" - the left panel (Markdown + review) is the primary differentiator.

Split-pane Electron application with tab-based interface. Left panel supports Projects list tab, closeable Settings tab, and closeable project detail tabs with markdown rendering, document tree navigation, and link navigation. Right panel supports multiple independent terminal sessions in tabs. Alpine.js handles reactive state and localStorage persistence. Markdown browser features README.md rendering with theme support, document tree display for quick navigation, and link-based browsing between files with tab management. Application-wide theming system with auto/dark/light/synthwave modes accessible via Settings tab.

## Setup

```bash
npm install
npx electron-rebuild  # Required after install for native modules
npm run build         # Bundle renderer code with esbuild
npm start             # Build + launch Electron
npm test              # Build + run Playwright E2E tests
npm run lint          # Check code with eslint
```

## Architecture

- **Electron**: Cross-platform app shell
- **Alpine.js**: Lightweight reactive UI (bundled via esbuild)
- **esbuild**: Fast JavaScript bundler for renderer code
- **ESM modules**: Clean module imports/exports (no global namespace)
- **marked**: Markdown-to-HTML conversion with GFM support
- **xterm.js (@xterm/xterm)**: Terminal emulator
- **node-pty**: Bash process spawning and I/O
- **IPC**: Simple send/receive for terminal/file communication (nodeIntegration enabled, contextIsolation disabled)
- **Playwright**: E2E testing for Electron apps
- **Vitest**: Unit testing for renderer modules

## Current Features

- **Split-pane layout**: Draggable divider between left panel (markdown browser) and right panel (terminals)
- **Tab system**: Each panel supports multiple tabs with add/close functionality
- **Project discovery**: Left panel Projects tab shows discovered Hegel projects via `hegel pm discover list`
- **Settings tab**: Closeable Settings tab (opened via ⚙️ button in Projects tab) contains theme selector and dev tools toggle
- **Project details**: Click projects to open detail tabs showing metrics, document tree, and README.md content
- **Markdown document tree**: Tree view of markdown files rendered with box-drawing characters, 3-line scrollable height
- **Tree navigation**: Click files in tree to navigate (regular click replaces content, Cmd+click opens new tab), current file highlighted
- **Markdown rendering**: README.md and other markdown files rendered with theme-aware styling in file tabs
- **Markdown review system**: Review tabs with grid layout (content + comment margin) for inline document commenting
- **Line-tracked rendering**: Review tabs render markdown blocks with line number metadata for selection-to-comment mapping
- **Selection-based commenting**: Select text in review tabs to add comments aligned to markdown blocks
- **Comment stacking**: Multiple comments on same block stack visually with z-index reordering on click
- **Review workflows**: Submit reviews (stubbed IPC ready for hegel CLI) or cancel with confirmation dialog
- **HTTP review server**: Local HTTP server for hegel CLI integration (POST /review opens review tabs programmatically)
- **Terminal environment injection**: HEGEL_IDE_URL env var set in all spawned terminals for CLI-to-IDE communication
- **Markdown link navigation**: Click markdown links to navigate between files in tab system (regular click navigates, Cmd+click opens new tab)
- **Theme system**: Application-wide theming with auto/dark/light/synthwave modes, localStorage persistence, system preference tracking
- **Multi-terminal**: Right panel supports multiple independent bash sessions in separate tabs
- **Terminal 1**: Non-closeable default terminal, additional terminals are closeable
- **Data caching**: Project details cached with refresh button for fresh data
- **State persistence**: Split position and theme preference saved to localStorage
- **Multi-terminal IPC**: Renderer ↔ main process communication routes I/O by terminalId
- **E2E test suite**: 70 tests covering tabs, terminals, projects, markdown rendering, review tabs, line tracking, themes, settings, and layout

## Usage

**Left Panel - Project Tabs:**
- Projects tab (non-closeable) displays discovered Hegel projects
- Click ⚙️ button in Projects tab to open Settings tab
- Click any project name to open a detail tab showing metrics, document tree, and README.md (if present)
- Document tree shows markdown files in compact 3-line scrollable view with box-drawing characters
- Click files in tree: regular click replaces content in current tab, Cmd/Ctrl+click opens new tab
- Current file highlighted in tree view for easy orientation
- README.md and other markdown files rendered as HTML with theme-aware styling
- Click markdown links to navigate: regular click navigates current tab, Cmd/Ctrl+click opens new tab
- Same file can only be open once (clicking link to already-open file switches to that tab)
- External links (http://, https://) open in system browser
- Missing README.md shows "Project missing README.md" message below metrics
- Project detail tabs include "Refresh" button to fetch fresh data (metrics, tree, and README)
- Click "×" on project tabs to close them
- Reopening a project uses cached data for instant display

**Left Panel - Review Tabs:**
- Review tabs provide inline commenting interface for markdown documents
- Grid layout with markdown content on left, collapsible comment margin on right
- Line numbers displayed for each markdown block (headings, paragraphs, code, lists, tables)
- Select any text within a block to open comment form in margin
- Comment form shows selected text preview and line range
- Save comments to pending queue (displayed as stacked cards in margin)
- Multiple comments on same block stack with visual offset, click to bring to front
- Submit Review button sends all pending comments via IPC (stubbed, ready for hegel CLI integration)
- Cancel Review button discards pending comments with confirmation dialog
- Comment count badge shows number of pending comments
- Submit button disabled when no comments exist

**Settings Tab:**
- Click ⚙️ button in Projects tab to open Settings
- Settings tab always opens at position 1 (right of Projects tab)
- Contains theme selector dropdown (Auto, Dark, Light, Synthwave)
- Contains "Toggle DevTools" button for debugging
- Click "×" to close Settings tab
- Re-opening Settings after close positions it at index 1 again

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
- Theme dropdown in Settings tab (open via ⚙️ button in Projects tab)
- Four themes available: Auto (system preference), Dark, Light, Synthwave
- Auto mode dynamically tracks system dark/light preference changes
- Theme selection persists across app restarts
- Synthwave theme features vibrant 80s-inspired colors and gradient effects

## Code Structure

```
hegel-ide/
├── esbuild.js              Build script for bundling renderer with esbuild
├── eslint.config.js        ESLint configuration (flat config format)
├── playwright.config.js    Playwright test configuration
│
├── src/                    Source code (main and renderer processes)
│   └── See src/README.md
│
├── lib/                    Pure utility functions (HTTP server, terminal env)
│   └── See lib/README.md
│
├── dist/                   Build output (gitignored, generated by esbuild)
│   ├── renderer.js         Bundled frontend code
│   ├── renderer.js.map     Source map for debugging
│   ├── index.html          Copied from src/renderer/
│   └── styles.css          Copied from src/renderer/
│
├── e2e/                    Playwright E2E tests
│   └── See e2e/README.md
│
├── test/                   Vitest unit tests
│   └── lib/                Unit tests for renderer modules and pure functions
│       └── See test/lib/README.md
│
├── .ddd/                   Document-Driven Development artifacts
│   ├── toys/               Discovery mode experiments (toy1-3: terminal, playwright, line-tracking)
│   └── feat/               Execution mode feature specs and plans
│       ├── http_review_server/        HTTP server for hegel CLI integration
│       ├── markdown_links/            Markdown link navigation with tab management
│       ├── markdown_review/           Markdown review tabs with inline commenting
│       ├── markdown_tree_nav/         Markdown document tree display and navigation
│       ├── project_readme_render/     Markdown browser Phase 1
│       ├── settings_tab/              Settings tab with theme selector and dev tools
│       ├── split_pane_layout/
│       ├── ui_tabs/
│       ├── ui_themes/
│       └── use-esbuild/               ESM migration with esbuild bundling
│
├── ARCHITECTURE.md         Technology stack and architectural decisions
├── VISION.md               Product vision and target users
├── CLAUDE.md               AI agent instructions for working on this project
└── README.md               This file
```

## Testing

- **Playwright E2E tests**: 79 tests covering tabs, terminals, projects, file tabs, review tabs, HTTP server integration, line tracking, markdown rendering, markdown tree, themes, settings, split-pane, and app launch
- **Vitest unit tests**: 45 tests for pure functions (terminal env, HTTP server utilities, markdown-line-tracking)
- **Test execution**: E2E via `npm test`, unit tests <1 second via `npm run test:unit`
- **Test infrastructure**: launchTestElectron() helper in test-constants.js centralizes Electron launch with TESTING env var
- **Coverage**: ~90% of current functionality (tab operations, multi-terminal, HTTP server, project details, file tabs, review workflows, markdown rendering, line tracking, markdown tree navigation, theme system, Settings tab)

## Known Limitations

- Native modules require `@electron/rebuild` after npm install (Electron uses NODE_MODULE_VERSION 140)
- Security model uses insecure IPC (acceptable for internal tool, revisit for distribution)
- Advanced terminal features not tested (Ctrl+C interruption, command history - manual verification acceptable)

## Dependencies

**Runtime:**
- `electron` - Application platform
- `alpinejs` - Reactive UI framework (bundled)
- `@xterm/xterm`, `@xterm/addon-fit` - Terminal UI
- `node-pty` - Pseudoterminal for bash
- `marked` - Markdown to HTML conversion
- `dayjs` - Date/time formatting

**Development:**
- `esbuild` - JavaScript bundler
- `eslint` - Code linting
- `@playwright/test` - E2E testing framework
- `vitest` - Unit testing framework
- `@electron/rebuild` - Native module compilation for Electron

## License

SSPL
