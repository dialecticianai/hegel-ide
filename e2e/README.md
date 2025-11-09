# e2e/

Playwright E2E test suite for Hegel IDE. Tests cover application launch, tab operations, multi-terminal functionality, project discovery, and split-pane layout.

## Structure

```
e2e/
├── test-constants.js                  Shared timeout constants and launchTestElectron() helper for test setup
├── app.spec.js                        Application launch and window content tests
├── tabs.spec.js                       Tab management (add, close, switch, overflow, project tabs, Settings tab)
├── terminal.spec.js                   Terminal presence, rendering, and I/O command tests
├── split-pane.spec.js                 Split-pane layout, divider, and project list tests
├── readme-rendering.spec.js           README markdown rendering and refresh functionality tests
├── markdown-links.spec.js             Markdown link navigation and tab behavior tests
├── markdown-tree.spec.js              Markdown document tree rendering and display tests
├── markdown-tree-navigation.spec.js   Tree click navigation and file highlighting tests
├── themes.spec.js                     Theme system in Settings tab (dropdown, switching, persistence, auto mode)
├── image-rendering.spec.js            Image path resolution in markdown (inline HTML and markdown syntax)
├── quit-test.spec.js                  Quit confirmation dialog behavior in test mode
│
└── fixtures/                          Test fixture data
    └── markdown-links/                Markdown files for link navigation tests (index.md, page-a.md, page-b.md, page-c.md)
```

## Test Execution

Run all tests:
```bash
npm test
```

Run specific test file:
```bash
npx playwright test e2e/tabs.spec.js
```

## TDD Approach

**During feature development:**
- Run only the related e2e tests for faster feedback cycles
- Example: If working on terminal features, run `npx playwright test e2e/terminal.spec.js`
- This speeds up iteration velocity during active development

**Before committing/merging:**
- Run the full test suite with `npm test` to ensure no regressions
- Verify all tests pass to maintain integration integrity

**Benefits:**
- Faster development cycles (targeted tests run in seconds vs full suite)
- Catch related issues immediately during development
- Full regression coverage before changes land

## Test Infrastructure

**`test-constants.js`** provides:

**launchTestElectron() helper**: Centralized Electron launch with `TESTING=true` env var to disable quit confirmation dialog during tests.

**Shared timeout constants**:
- `ALPINE_INIT`: 300ms - Wait for Alpine.js initialization
- `TERMINAL_READY`: 600ms - Wait for terminal to be ready for input
- `TERMINAL_EXEC`: 500ms - Wait for terminal command to execute
- `TERMINAL_EXEC_FAST`: 300ms - Wait for fast terminal commands
- `PROJECT_LOAD`: 1500ms - Wait for projects list to load
- `PROJECT_DETAIL`: 2000ms - Wait for project details to load
- `TAB_CREATE`: 500ms - Wait for tab to be created
- `TAB_CLOSE`: 200ms - Wait for tab close animation
- `SPLIT_PANE_INIT`: 500ms - Wait for split-pane to initialize
- `HEGEL_CMD`: 2000ms - Wait for hegel command to execute

## Coverage

Test suite covers core application functionality:
- **Tab operations**: Add, close, switch, overflow behavior, Settings tab positioning and deduplication
- **Terminal I/O**: Command execution, multi-terminal support
- **Split-pane layout**: Panel structure, resize, project discovery
- **App launch**: Window initialization, title, content visibility
- **Theme system**: Theme dropdown in Settings tab, switching, persistence, auto mode
- **Settings tab**: Opening via ⚙️ button, closeable, positioning at index 1, deduplication
- **README rendering**: Markdown display, formatting, refresh
- **Markdown link navigation**: Regular click navigation, modifier click new tabs, file deduplication, external link passthrough
- **Markdown tree**: Document tree rendering, box-drawing characters, scrolling, loading states
- **Tree navigation**: Click to replace content, Cmd+Click for new tabs, file highlighting, link styling
- **Image rendering**: Inline HTML images and markdown image syntax with correct path resolution
- **Quit behavior**: Confirmation dialog skipped in test mode via TESTING env var
