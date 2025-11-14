# HTTP Review Server Specification

HTTP server integration for hegel-cli → Electron IDE review workflow.

## Overview

**What it does:** Enables hegel-cli (running in IDE terminals) to open markdown review tabs in the Electron IDE via HTTP API instead of spawning standalone GUI.

**Key principles:**
- Minimal HTTP API surface (single endpoint, simple JSON)
- Agent-facing integration (hegel CLI to IDE communication)
- DI-friendly pure functions for unit testability
- Unified terminal spawn logic with environment injection

**Scope:** This is an integration hookup, not production hardening. Focus on making the pieces talk to each other correctly with good test coverage.

**Integration context:**
- HTTP server runs in Electron main process
- Review UI already exists in renderer (src/renderer/tabs.js:159-193)
- Terminal spawn happens in main process (src/main.js:27-35, 167-177)
- Project discovery via existing get-projects IPC (src/renderer/projects.js:17-37)

## Data Model

### HTTP Request
```json
POST /review
Content-Type: application/json

{
  "files": [
    "/absolute/path/to/SPEC.md",
    "/absolute/path/to/PLAN.md",
    "/absolute/path/to/README.md"
  ]
}
```

**Fields:**
- `files` (required): Array of absolute file paths to open for review
- All paths must exist on filesystem
- Relative paths not supported (caller's responsibility to resolve)

### HTTP Response - Success
```json
HTTP 200 OK
Content-Type: application/json

{
  "success": true
}
```

### HTTP Response - Missing Files
```json
HTTP 404 Not Found
Content-Type: application/json

{
  "missing": [
    "/absolute/path/to/nonexistent.md"
  ]
}
```

**Validation:** All files checked before opening any tabs. If ANY file missing, return 404 with complete list of missing files.

### Environment Variable
```bash
HEGEL_IDE_URL=http://localhost:54321
```

**Injected into:** All terminal PTY processes spawned by IDE
**Format:** `http://localhost:<port>` where port is OS-assigned (port 0 strategy)
**Lifetime:** Set at terminal spawn, persists for shell session

### Internal IPC Message (NEW)
```javascript
ipcRenderer.invoke('open-review-tabs', { files: ['/abs/path/...'] })
→ { success: true } or { success: false, error: 'message' }
```

**Handler location:** src/main.js (NEW)
**Behavior:**
- Send message to renderer to open tabs
- Renderer calls existing `openReviewTab(absolutePath, projectPath)` for each file
- Returns success/failure

## Core Operations

### Server Startup

**Timing:** Immediately after `app.whenReady()`, before window creation

**Behavior:**
- Create HTTP server on port 0 (OS assigns random available port)
- Register POST /review endpoint handler
- Store server instance and assigned port in module-level variables
- Non-blocking - does not delay window creation
- Server runs for lifetime of application

**Error handling:** If port binding fails, log error but continue app launch (fail gracefully)

### Terminal Environment Injection

**Function signature:** `spawnTerminal(terminalId, httpPort)`

**Behavior:**
- Build augmented environment by merging `process.env` with `HEGEL_IDE_URL`
- Detect shell: Windows → powershell.exe, Unix → $SHELL or bash
- Spawn PTY with augmented environment, cwd from terminalCwd
- Set up terminal I/O forwarding (existing pattern)
- Store in ptyProcesses map
- Return ptyProcess

**Call sites:**
- Initial term-1 in createWindow() - MODIFIED
- create-terminal IPC handler - MODIFIED

**Refactor:** Unifies two existing spawn points (src/main.js:27-35, 167-177) into single function

### HTTP Request Handling

**Endpoint:** POST /review

**Request flow:**
1. Parse JSON body
2. Validate required `files` field exists and is array
3. Check all files exist using fs.promises.access()
4. If any missing: return 404 with missing list
5. If all exist: invoke open-review-tabs IPC
6. Return 200 success

**Error handling:**
- Invalid JSON: 400 Bad Request
- Missing/invalid files field: 400 Bad Request
- Files don't exist: 404 Not Found
- IPC failure: 500 Internal Server Error

### Review Tab Opening

**IPC Handler:** open-review-tabs

**Behavior:**
1. Receive array of absolute file paths from main process
2. For each file path:
   - Match against discovered projects (check if path starts with any project.project_path)
   - If match found: call `openReviewTab(absolutePath, projectPath)`
   - If no match: call `openReviewTab(absolutePath, null)` (review UI opens, save deferred)
3. Return success

**Project matching logic:**
```javascript
function findProjectForFile(filePath, projects) {
  for (const project of projects) {
    if (project.project_path && filePath.startsWith(project.project_path + '/')) {
      return project.project_path;
    }
  }
  return null;
}
```

**Integration:** Uses existing `openReviewTab()` from src/renderer/tabs.js:159-193

## Test Scenarios

### Simple - Single File Review

**Setup:** IDE running, terminal spawned with HEGEL_IDE_URL set

**Action:**
```bash
curl -X POST http://localhost:54321/review \
  -H "Content-Type: application/json" \
  -d '{"files": ["/Users/test/project/SPEC.md"]}'
```

**Expected:**
- HTTP 200 response with `{"success": true}`
- Review tab opens in left panel with SPEC.md content
- Tab label shows "SPEC" (filename without extension)
- File content loaded and displayed

### Complex - Multi-File Review

**Setup:** IDE running with hegel project at /Users/test/myproject

**Action:**
```bash
curl -X POST http://localhost:54321/review \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      "/Users/test/myproject/SPEC.md",
      "/Users/test/myproject/PLAN.md",
      "/Users/test/myproject/README.md"
    ]
  }'
```

**Expected:**
- HTTP 200 response
- Three review tabs open in left panel
- Each tab shows correct file content
- All tabs associated with /Users/test/myproject (enables save to reviews.json)
- Active tab is the last one opened (README.md)

### Error - Missing Files

**Setup:** IDE running

**Action:**
```bash
curl -X POST http://localhost:54321/review \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      "/Users/test/exists.md",
      "/Users/test/missing.md",
      "/Users/test/also-missing.md"
    ]
  }'
```

**Expected:**
- HTTP 404 response
- Response body: `{"missing": ["/Users/test/missing.md", "/Users/test/also-missing.md"]}`
- No tabs opened (all-or-nothing validation)

### Error - Invalid Request

**Action:**
```bash
curl -X POST http://localhost:54321/review \
  -H "Content-Type: application/json" \
  -d '{"invalid": "payload"}'
```

**Expected:**
- HTTP 400 Bad Request
- Response indicates missing required "files" field

### Error - Malformed JSON

**Action:**
```bash
curl -X POST http://localhost:54321/review \
  -H "Content-Type: application/json" \
  -d 'not valid json'
```

**Expected:**
- HTTP 400 Bad Request
- Response indicates JSON parse error

## Success Criteria

**Agent-verifiable (required for completion):**
- Unit tests pass: `npm run test:unit` exits 0
- E2E tests pass: `npm test` exits 0
- Build succeeds: `npm run build` exits 0
- Lint passes: `npm run lint` exits 0

**Specific test coverage:**
- Unit test: `findProjectForFile()` matches project paths correctly
- Unit test: `buildTerminalEnv()` merges env vars with HEGEL_IDE_URL
- Unit test: Request parsing validates files field and structure
- Unit test: File existence checking returns correct missing list
- E2E test: Terminal spawned with HEGEL_IDE_URL env var set
- E2E test: POST /review opens review tab(s) with correct file content
- E2E test: POST /review returns 404 for missing files
- E2E test: Multiple terminals all receive HEGEL_IDE_URL
- E2E test: Invalid JSON returns 400
- E2E test: Project path matching associates files with projects correctly

## Out of Scope

**Deferred to future work:**
- Authentication/authorization (localhost-only acceptable)
- HTTPS/TLS (local HTTP sufficient)
- Request rate limiting
- hegel-cli changes (separate codebase)
- Review completion polling (hegel-cli responsibility)
- Review submission to .hegel/reviews.json integration (already complete in hegel-cli)
- Advanced error recovery (IDE closed while CLI polling)
- WebSocket for bidirectional communication
- Multiple concurrent review sessions coordination
- Standalone file review saving (requires sidecar .review.N files)

## File Changes Summary

**NEW:**
- lib/http-server.js - Pure functions for HTTP logic
- lib/terminal-env.js - Pure functions for env building
- test/lib/http-server.test.js - Unit tests
- test/lib/terminal-env.test.js - Unit tests
- e2e/http-server.spec.js - E2E integration tests

**MODIFIED:**
- src/main.js - Add HTTP server, spawnTerminal() function, open-review-tabs IPC handler, refactor term-1 and create-terminal to use spawnTerminal()
- src/renderer/tabs.js - Add IPC listener for open-review-tabs message
- src/renderer/projects.js - Expose findProjectForFile logic (or duplicate in tabs.js)

**Dependencies:** No new dependencies (use Node built-in `http` and `fs` modules)
