# e2e/

Playwright E2E test suite for Hegel IDE. Tests cover application launch, tab operations, multi-terminal functionality, project discovery, and split-pane layout.

## Structure

```
e2e/
├── test-constants.js       Shared timeout constants for consistent test timing
│
├── app.spec.js             Application launch and window content tests
├── smoke.spec.js           Basic smoke test for app startup
│
├── tabs.spec.js            Tab management tests (add, close, switch, overflow)
│                           - Default tabs (Projects, Terminal 1)
│                           - Terminal tab operations
│                           - Project detail tab operations
│
├── terminal.spec.js        Terminal presence and I/O tests
│                           - Terminal container rendering
│                           - Command execution (echo, pwd, sequential)
│
├── split-pane.spec.js      Split-pane layout and drag functionality tests
│                           - Panel structure and dimensions
│                           - Divider cursor and drag behavior
│                           - Project list population from hegel CLI
│
└── alpine.spec.js.bak      Archived Alpine reactivity test (test component removed)
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

## Test Constants

Shared timeout values in `test-constants.js`:
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

- **25 tests total** covering ~90% of application functionality
- **Tab operations**: 11 tests
- **Terminal I/O**: 6 tests
- **Split-pane layout**: 4 tests
- **App launch**: 3 tests
- **Smoke test**: 1 test
