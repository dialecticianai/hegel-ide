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
├── file-tabs.spec.js                  File tab operations with absolute paths (open, load, close, multiple tabs)
├── readme-rendering.spec.js           README markdown rendering and refresh functionality tests
├── markdown-links.spec.js             Markdown link navigation and tab behavior tests
├── markdown-tree.spec.js              Markdown document tree rendering and display tests
├── markdown-tree-navigation.spec.js   Tree click navigation and file highlighting tests
├── markdown-line-tracking.spec.js     Line-tracking module integration (parsing, DOM attributes, block finding)
├── review-tabs.spec.js                Review tab infrastructure (selection, comments, cards, submit/cancel workflows)
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

## Test Writing Guidelines

**Combine independent assertions into single tests:**

Electron app launches are expensive. When multiple assertions test independent aspects of the same initial state, combine them into one test:

**✅ Good - Combined test:**
```javascript
test('initial UI renders correctly', async () => {
  const electronApp = await launchTestElectron();
  // ... setup ...

  // Multiple independent assertions about initial state
  expect(await projectsTab.isVisible()).toBe(true);
  expect(await terminalTab.isVisible()).toBe(true);
  expect(await overflowX).toBe('auto');

  await electronApp.close();
});
```

**❌ Bad - Separate tests for independent state checks:**
```javascript
test('projects tab is visible', async () => {
  const electronApp = await launchTestElectron();
  // ... setup ...
  expect(await projectsTab.isVisible()).toBe(true);
  await electronApp.close();
});

test('terminal tab is visible', async () => {
  const electronApp = await launchTestElectron();
  // ... setup ... (duplicated!)
  expect(await terminalTab.isVisible()).toBe(true);
  await electronApp.close();
});
```

**When to combine tests:**
- Checking different DOM elements in the same initial state
- Verifying CSS properties, dimensions, visibility together
- Testing multiple aspects of rendered output without interactions

**When to keep tests separate:**
- Tests involving state changes (clicks, navigation, data mutations)
- Tests requiring different setup or teardown
- Tests with complex multi-step flows
- Tests that verify different error states or edge cases

**Example patterns to combine:**
- "element exists" + "element has correct style" + "element has correct dimensions"
- "dropdown visible" + "dropdown has all options"
- "tab opens" + "tab has correct UI elements" + "tab shows expected content"

**Efficiency impact:**
- Reducing unnecessary Electron launches speeds up test execution
- Suite went from 63 → 51 tests (19% reduction) saving ~15-20s per run
- Each test combination eliminates ~1-2 seconds of app launch overhead

## Test Infrastructure

**`test-constants.js`** provides:

**launchTestElectron() helper**: Centralized Electron launch with `TESTING=true` env var to disable quit confirmation dialog during tests.

**waitForCondition() helper**: Poll for a condition instead of blind waiting. More reliable and faster than `waitForTimeout()`.

```javascript
const { waitForCondition, PROJECT_DETAIL } = require('./test-constants');

// Instead of: await mainWindow.waitForTimeout(PROJECT_DETAIL);
// Use:
await waitForCondition(
  mainWindow,
  async () => await mainWindow.locator('.project-tab').isVisible(),
  PROJECT_DETAIL,
  50,
  'Project tab did not appear'
);
```

**Benefits of waitForCondition:**
- **Faster**: Stops waiting immediately when condition is met (vs blind timeout)
- **More reliable**: Polls actual state instead of hoping timing is right
- **Better errors**: Shows what condition failed and last error encountered
- **Configurable**: Adjust poll interval (default 50ms) and timeout per use case

**When to use waitForCondition vs waitForTimeout:**
- ✅ Use `waitForCondition` for checking UI state (element visible, text content, classes)
- ✅ Use `waitForCondition` for async operations (data loading, API responses)
- ⚠️ Use `waitForTimeout` only for animations/transitions that have no observable state change

**Shared timeout constants** (use with waitForCondition):
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
- **File tabs**: Open with absolute paths, content loading, closeable, multiple tabs
- **Review tabs**: Grid layout, line-tracked markdown, text selection, comment form, comment cards, stacking, submit/cancel workflows
- **Markdown line tracking**: Block parsing with line ranges, DOM attribute generation, block finding from selection
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
