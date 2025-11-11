# HTTP Review Server Implementation Plan

Implementation plan for HTTP server integration enabling hegel-cli to open review tabs in Electron IDE.

## Overview

**Goal:** Enable terminal-based hegel-cli to trigger review tab opening via HTTP API, with clean testable architecture.

**Scope:**
- Pure functions for HTTP logic and environment building (fully unit tested)
- Terminal spawn refactor to unify two existing code paths
- HTTP server in main process with single POST endpoint
- IPC integration for opening review tabs from main to renderer
- E2E tests for full integration flow

**Priorities:**
1. Unit test coverage for all pure logic
2. DRY terminal spawning (eliminate duplication)
3. Simple HTTP API (no premature complexity)
4. Working integration with existing review tab system

## Methodology

**TDD Approach:**
- Write unit tests first for pure functions (terminal-env, http-server logic)
- Implement pure functions to pass tests
- Integration via E2E tests (Playwright patterns)
- Focus on core paths and essential errors, not exhaustive edge cases

**What to test:**
- Unit: Pure function behavior (env building, project matching, request parsing, file validation)
- E2E: HTTP endpoint behavior, terminal env vars, tab opening, error responses

**What NOT to test:**
- Internal implementation details of refactored functions
- Electron/Node.js built-in module behavior
- Renderer Alpine.js reactivity (already tested in existing E2E)

---

## Step 1: Terminal Environment Building

### Goal
Create pure function for building terminal environment with HTTP URL injection, making terminal spawn logic testable.

### Step 1.a: Write Tests

Create test/lib/terminal-env.test.js (NEW file) following vitest patterns:
- Import test utilities: `import { describe, it, expect } from 'vitest'`
- Import function: `import { buildTerminalEnv } from '../../lib/terminal-env.js'`
- Use ESM imports (vitest supports both, prefer ESM for consistency with renderer tests)

Test cases in describe block:
- Basic functionality: Pass simple env object and port, verify HEGEL_IDE_URL added correctly
- Preservation: Verify all original env vars still present in returned object
- Immutability: Verify original baseEnv object not modified (compare before/after)
- URL format: Verify exact format matches `http://localhost:${port}`
- Edge cases: undefined baseEnv (should work), zero port, high port (65535)

Pattern follows markdown-line-tracking.test.js structure (lines 1-16)

### Step 1.b: Implement

Create lib/terminal-env.js module (NEW file):
- Use CommonJS exports for main process compatibility: `module.exports = { buildTerminalEnv }`
- Function signature: `function buildTerminalEnv(baseEnv, httpPort)`
- Implementation: Return new object using spread: `return { ...baseEnv, HEGEL_IDE_URL: \`http://localhost:${httpPort}\` }`
- Pure function with no side effects or external dependencies
- Handle edge cases: undefined baseEnv defaults to empty object, port validation optional

File location: Create lib/ directory at project root if not exists
Export pattern matches existing project structure (see test mocking patterns)

### Success Criteria

- Unit tests pass for all buildTerminalEnv scenarios
- Function exported as ES module for test imports
- No dependencies beyond Node.js built-ins

---

## Step 2: HTTP Request Logic

### Goal
Extract HTTP request handling logic into testable pure functions.

### Step 2.a: Write Tests

Create test/lib/http-server.test.js (NEW file) following vitest patterns:
- Import test utilities: `import { describe, it, expect } from 'vitest'`
- Import functions: `import { parseReviewRequest, checkFilesExist, findProjectForFile } from '../../lib/http-server.js'`
- Import path and fs for test fixtures: `import path from 'path'`, `import fs from 'fs'`

**parseReviewRequest test suite:**
- Valid request: Pass valid JSON string with files array, expect success
- Missing files field: Pass JSON without files, expect throw with error message
- Non-array files: Pass JSON with files as string, expect throw
- Empty array: Pass JSON with empty files array, expect throw
- Invalid element: Pass JSON with non-string in files array, expect throw
- Invalid JSON: Pass malformed JSON string, expect JSON.parse throw

**checkFilesExist test suite:**
- All exist: Create temp files in test fixtures, verify valid true and missing empty array
- Some missing: Mix of existing and non-existing paths, verify missing array correct
- All missing: Only non-existing paths, verify valid false
- Async handling: Verify function returns promise and can be awaited
- Use e2e/fixtures/markdown-links directory for existing files in tests

**findProjectForFile test suite:**
- Exact match: File path starts with project path, verify returns project path
- No match: File path outside all projects, verify returns null
- Multiple projects: Array with multiple projects, verify returns first match
- Empty projects: Empty array, verify returns null
- Trailing slash logic: Verify uses `project_path + '/'` pattern to avoid partial matches
- Mock projects structure: `[{ name: 'test', project_path: '/absolute/path' }]`

### Step 2.b: Implement

Create lib/http-server.js module (NEW file):
- Import fs: `const fs = require('fs').promises` for async file operations
- Use CommonJS exports: `module.exports = { parseReviewRequest, checkFilesExist, findProjectForFile }`

**parseReviewRequest function:**
- Signature: `function parseReviewRequest(bodyString)`
- Parse JSON: `const body = JSON.parse(bodyString)` (throws on invalid JSON)
- Validate files field exists: `if (!body.files) throw new Error('Missing required field: files')`
- Validate files is array: `if (!Array.isArray(body.files)) throw new Error('files must be an array')`
- Validate array not empty: `if (body.files.length === 0) throw new Error('files array cannot be empty')`
- Validate array elements are strings: `body.files.forEach((f, i) => { if (typeof f !== 'string') throw new Error(\`files[${i}] must be a string\`) })`
- Return validated object: `return { files: body.files }`

**checkFilesExist function:**
- Signature: `async function checkFilesExist(filePaths)`
- Check each path with fs.access using fs.constants.F_OK flag
- Use Promise.allSettled to check all files in parallel
- Collect results: `const missing = []; results.forEach((result, i) => { if (result.status === 'rejected') missing.push(filePaths[i]) })`
- Return validation result: `return { valid: missing.length === 0, missing }`

**findProjectForFile function:**
- Signature: `function findProjectForFile(filePath, projects)`
- Iterate projects: `for (const project of projects)`
- Check match: `if (project.project_path && filePath.startsWith(project.project_path + '/')) return project.project_path`
- Return null if no match found
- Projects array structure: `[{ name: "...", project_path: "/abs/path" }, ...]`

### Success Criteria

- All unit tests pass for request parsing validation
- All unit tests pass for file existence checking
- All unit tests pass for project path matching
- Functions use async/await for filesystem operations where needed
- Pure functions with no side effects or hidden dependencies

**Commit Point:** feat(http-review): add pure functions for terminal env and HTTP logic

---

## Step 3: Terminal Spawn Refactor

### Goal
Eliminate code duplication by extracting unified terminal spawn function.

### Step 3.a: Write Tests

E2E test describing terminal spawn behavior:
- Spawned terminal has HEGEL_IDE_URL environment variable set
- Multiple terminals spawned sequentially all have the env var
- Env var format is valid HTTP localhost URL
- Other environment variables are preserved from parent process

### Step 3.b: Implement

Extract spawnTerminal function in main.js (around line 27, before createWindow):
- Function signature: `function spawnTerminal(terminalId, httpPort)`
- Import buildTerminalEnv from lib/terminal-env.js at top of file
- Call buildTerminalEnv with process.env and httpPort to get augmented env
- Detect shell: `os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash')`
- Call pty.spawn with shell, empty args array, and options object containing name, cols (80), rows (24), cwd (terminalCwd), and augmented env
- Set up onData handler: `ptyProc.onData(data => mainWindow.webContents.send('terminal-output', { terminalId, data }))`
- Add null check for mainWindow and isDestroyed check in handler
- Store in ptyProcesses map: `ptyProcesses.set(terminalId, ptyProc)`
- Return ptyProc

Refactor existing spawn sites:
- Line 27-35 in createWindow: Replace inline spawn with `const term1 = spawnTerminal('term-1', httpPort)`
- Line 167-186 in create-terminal handler: Replace inline spawn with `const ptyProc = spawnTerminal(terminalId, httpPort)`
- Remove duplicate onData setup code from both locations (now handled in spawnTerminal)

### Success Criteria

- spawnTerminal function consolidates duplicate spawn logic
- Both spawn sites successfully use new function
- No behavioral changes to terminal creation
- E2E tests pass for terminal spawn with env vars
- Existing terminal E2E tests still pass

**Commit Point:** refactor(terminal): extract unified spawnTerminal function

---

## Step 4: HTTP Server Integration

### Goal
Add HTTP server to main process that opens review tabs via IPC.

### Step 4.a: Write Tests

E2E test suite describing HTTP server behavior:
- Server starts on app launch and binds to random port
- POST to /review with valid files array returns 200 success
- POST to /review with missing files returns 404 with missing list
- POST to /review with invalid JSON returns 400 error
- POST to /review with missing files field returns 400 error
- Multiple concurrent requests handled correctly
- Server shuts down cleanly on app quit

### Step 4.b: Implement

Add HTTP server to main.js (top of file):
- Import Node built-in http module: `const http = require('http')`
- Import utilities: `const { parseReviewRequest, checkFilesExist } = require('../lib/http-server.js')`
- Add module-level variables after ptyProcesses declaration: `let httpServer; let httpPort;`

Create HTTP server in app.whenReady (before createWindow call):
- Create server: `httpServer = http.createServer(handleRequest)`
- Listen on port 0: `httpServer.listen(0, 'localhost', () => { httpPort = httpServer.address().port; createWindow(); })`
- This ensures server is ready and port is assigned before window creation

Implement handleRequest function (before app.whenReady):
- Function signature: `async function handleRequest(req, res)`
- Check req.method and req.url to route requests
- Only accept POST to /review path, return 405 for other methods, 404 for other paths
- Collect request body chunks: `let body = ''; req.on('data', chunk => body += chunk);`
- On req end event, parse and process request asynchronously
- Wrap processing in try-catch for error handling
- Call parseReviewRequest with body string, catch validation errors for 400 response
- Call checkFilesExist with files array from parsed request
- If validation result has missing files, return 404 with JSON: `{ missing: validationResult.missing }`
- If all valid, send to renderer: `mainWindow.webContents.send('open-review-tabs', { files })`
- Return 200 success: `res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true }))`
- In catch block, determine appropriate status (400 for validation, 500 for other errors) and return error JSON

Add cleanup on app quit (in existing quit handlers):
- Close server: `if (httpServer) httpServer.close()`

### Success Criteria

- HTTP server binds to OS-assigned port successfully
- All E2E tests pass for HTTP endpoint behavior
- Error responses include appropriate status codes and JSON bodies
- Server handles malformed requests without crashing
- Server starts before window creation
- Build and lint pass with no errors

**Commit Point:** feat(http-review): add HTTP server with /review endpoint

---

## Step 5: IPC Integration for Review Tabs

### Goal
Connect HTTP server to renderer review tab system via IPC.

### Step 5.a: Write Tests

E2E test describing IPC integration:
- HTTP POST triggers review tabs to open in left panel
- Correct file content displayed in each opened tab
- Files within discovered projects get projectPath associated
- Files outside projects open with null projectPath
- Multiple files open multiple tabs
- Duplicate file paths reuse existing tabs rather than creating duplicates

### Step 5.b: Implement

Main process sends IPC message (already implemented in Step 4):
- In handleRequest function, after validation, send message to renderer
- Use pattern: `mainWindow.webContents.send('open-review-tabs', { files })`
- No response needed from renderer for this message type (fire-and-forget)

Add IPC listener in renderer (src/renderer/tabs.js):
- Create new exported function: `export function initializeReviewIPC()`
- Similar to initializeDefaultTerminal pattern in terminals.js (line 79-131)
- Inside function, set up listener: `ipcRenderer.on('open-review-tabs', (event, { files }) => { ... })`
- Access Alpine data: `const alpineData = Alpine.$data(document.getElementById('app'))`
- Access projects list from Alpine data: `alpineData.projects`
- For each file path in files array, find matching project using startsWith logic
- Iterate projects checking if file path starts with `project.project_path + '/'`
- Call existing openReviewTab: `alpineData.openReviewTab(filePath, matchedProjectPath || null)`
- openReviewTab is already defined in tabs.js (line 159) and handles deduplication

Wire up initialization in src/renderer/index.js:
- Import new function: Add `initializeReviewIPC` to import from tabs.js (line 5)
- Call after Alpine starts: Add `initializeReviewIPC()` after `initializeDefaultTerminal()` (line 49)
- This ensures IPC listener is registered when renderer loads

Projects data structure (from get-projects IPC):
- Array of objects with `name` and `project_path` fields
- Example: `{ name: "hegel-ide", project_path: "/Users/user/Code/hegel-ide" }`
- Already loaded in alpineData.projects via loadProjects in init

### Success Criteria

- IPC message successfully triggers review tab opening
- Project path matching works correctly for files in projects
- Standalone files open with null projectPath
- All E2E tests pass for complete HTTP to tab flow
- No changes needed to existing openReviewTab function
- Existing review tab E2E tests still pass

**Commit Point:** feat(http-review): integrate IPC for opening review tabs

---

## Step 6: End-to-End Validation

### Goal
Verify complete integration from HTTP request to review tab display.

### Step 6.a: Write Tests

Comprehensive E2E test suite covering full flow:
- Terminal spawned with HEGEL_IDE_URL in environment
- HTTP POST request to URL from env var opens tabs
- Single file review opens one tab with correct content
- Multi-file review opens multiple tabs
- Missing file returns 404 before opening any tabs
- Invalid request format returns 400
- Project path association enables review saving
- Concurrent requests from multiple terminals work correctly

### Step 6.b: Implement

Create e2e/http-server.spec.js following existing E2E patterns:
- Import test utilities: `const { test, expect } = require('@playwright/test')`
- Import constants: `const { launchTestElectron, ALPINE_INIT, TAB_CREATE } = require('./test-constants')`
- Import Node modules: `const http = require('http')`, `const path = require('path')`, `const fs = require('fs')`
- Use existing fixtures: `const fixturesDir = path.join(__dirname, 'fixtures', 'markdown-links')`

Test pattern for extracting HTTP port from terminal:
- Launch app: `const electronApp = await launchTestElectron()`
- Get mainWindow: `const mainWindow = electronApp.windows().find(w => w.url().includes('index.html'))`
- Wait for Alpine: `await mainWindow.waitForTimeout(ALPINE_INIT)`
- Extract env from terminal PTY (may need to add test helper to expose httpPort)

Alternative simpler approach for testing:
- Since httpPort is module-level in main.js, expose it via IPC for testing
- Add test-only IPC handler: `ipcMain.handle('get-http-port', () => httpPort)`
- In tests: `const port = await electronApp.evaluate(() => require('electron').ipcRenderer.invoke('get-http-port'))`

Making HTTP requests in tests:
- Use Node http module with promises: `new Promise((resolve, reject) => { const req = http.request({ hostname: 'localhost', port, path: '/review', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => { ... }); req.write(JSON.stringify({ files: [...] })); req.end(); })`
- Or use simpler fetch if available in test environment

Verifying review tabs opened:
- After HTTP request, wait for tab: `await mainWindow.waitForTimeout(TAB_CREATE)`
- Check tab exists: `const reviewTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'SPEC' })`
- Access Alpine data: `const tabData = await mainWindow.evaluate(() => { const alpineData = Alpine.$data(document.getElementById('app')); return alpineData.leftTabs.find(t => t.type === 'review'); })`
- Verify structure matches review-tabs.spec.js patterns (line 35-46)

Test fixtures:
- Reuse existing e2e/fixtures/markdown-links directory files
- Known absolute paths for testing
- No need for new fixtures initially

### Success Criteria

- Full test suite passes with all scenarios green
- Test coverage includes happy path and error cases
- Tests use existing test infrastructure patterns
- Tests run quickly (under 30 seconds for E2E suite)
- No flaky tests or timing-dependent failures

**Commit Point:** test(http-review): add comprehensive E2E test coverage

---

## Final Success Criteria

After all steps complete:

- All unit tests pass (npm run test:unit exits zero)
- All E2E tests pass (npm test exits zero)
- Build succeeds (npm run build exits zero)
- Lint passes (npm run lint exits zero)
- Terminal spawn code duplication eliminated
- HTTP server operational on app launch
- Review tabs open via HTTP POST requests
- Environment variable injection working
- Project path matching associates files correctly
- Error handling returns appropriate HTTP status codes

---

## Out of Scope (Deferred)

Not included in this implementation:
- hegel-cli changes to call HTTP API
- Review submission integration (already complete in hegel-cli)
- WebSocket bidirectional communication
- Authentication or authorization
- HTTPS/TLS support
- Advanced error recovery scenarios
- Documentation updates (handled in separate phase)
- Manual browser testing (handled in separate phase)
