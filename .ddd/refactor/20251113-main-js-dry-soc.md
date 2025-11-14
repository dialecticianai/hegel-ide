# Refactor Analysis: main.js DRY/SoC Violations

**Date:** 2025-11-13
**Target:** `src/main.js` (564 lines)
**Goal:** Reduce token overhead through DRY extraction and SoC-based module splitting

---

## DRY Violations

### 1. Duplicated Hegel Command Spawning Pattern (CRITICAL)

**Lines affected:** 188-219, 223-254, 258-283, 287-312, 315-341, 345-376, 461-492

**Pattern:** The same spawn/stdout/stderr/close/error boilerplate is repeated **7 times** with only minor variations:

```javascript
// Repeated ~7 times throughout the file
return new Promise((resolve, reject) => {
  const hegel = spawn('hegel', [args...]);
  let stdout = '';
  let stderr = '';

  hegel.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  hegel.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  hegel.on('close', (code) => {
    if (code !== 0) {
      reject(new Error(`[error message]: ${stderr}`));
      return;
    }
    // Parse result or return success
  });

  hegel.on('error', (error) => {
    reject(new Error(`Failed to spawn hegel: ${error.message}`));
  });
});
```

**Token cost:** ~20 lines × 7 instances = 140 lines of duplicated boilerplate

**Variations:**
- Command arguments differ
- Error messages differ slightly
- Some parse JSON output, some return `{ success: true }`
- `save-review` writes to stdin

**Proposed solution:** Extract to `src/main/hegel.js`:
```javascript
async function runHegelCommand(args, options = {}) {
  const {
    parseJson = false,
    stdin = null,
    cwd = null
  } = options;

  // Single implementation of spawn pattern
  // Returns parsed result or success
}
```

**Token savings:** ~140 lines → ~30 lines (extraction + call sites) = **~110 lines saved**

---

### 2. Duplicated File Reading Pattern

**Lines affected:** 414-423, 426-434

**Pattern:** Similar fs.readFile with error handling repeated twice:

```javascript
// Repeated 2 times
try {
  const content = await fs.readFile(filePath, 'utf-8');
  return { content };
} catch (error) {
  return { error: error.message };
}
```

**Token cost:** ~8 lines × 2 = 16 lines

**Proposed solution:** Extract to shared helper in `src/main/ipc-handlers/files.js`

**Token savings:** ~16 lines → ~6 lines = **~10 lines saved**

---

## SoC Violations

### 1. File Size Exceeds Guidelines

**Current:** 564 lines
**Guideline:** 200 lines per file
**Violation:** 282% of recommended size

### 2. Mixed Concerns in Single File

**Identified concerns:**

1. **Window Management** (lines 11, 156-167, 509-517)
   - BrowserWindow creation
   - Window state management
   - Window lifecycle

2. **Terminal/PTY Management** (lines 12, 17, 20-93, 168-185, 380-401)
   - PTY process spawning
   - Foreground process detection
   - Terminal I/O routing
   - Terminal lifecycle

3. **HTTP Server** (lines 13-14, 96-153, 541-546, 560-564)
   - Server creation
   - Request handling
   - Server lifecycle

4. **IPC Handlers - Projects** (lines 188-342)
   - get-projects
   - get-project-details
   - remove-project
   - refresh-project
   - refresh-all-projects
   - get-markdown-tree

5. **IPC Handlers - Terminals** (lines 172-185, 380-401)
   - terminal-input
   - terminal-resize
   - create-terminal
   - close-terminal

6. **IPC Handlers - Files** (lines 414-434)
   - get-project-file
   - get-file-content

7. **IPC Handlers - Reviews** (lines 437-497)
   - save-review

8. **IPC Handlers - Utils** (lines 404-411, 500-507)
   - toggle-devtools
   - get-terminal-cwd
   - get-http-port

9. **App Lifecycle** (lines 520-564)
   - before-quit
   - window-all-closed
   - activate
   - quit

**Problem:** All concerns entangled in single file. Adding new IPC handlers or modifying one concern requires navigating unrelated code.

---

## Proposed Module Structure

```
src/main/
├── index.js                      # App entry, orchestrates modules (~50 lines)
├── window.js                     # Window creation and management (~50 lines)
├── terminal.js                   # Terminal/PTY operations (~80 lines)
├── http-server.js                # HTTP server setup and lifecycle (~30 lines)
├── hegel.js                      # Reusable hegel command spawner (~40 lines)
└── ipc-handlers/
    ├── projects.js               # Project-related IPC (~80 lines)
    ├── terminals.js              # Terminal-related IPC (~40 lines)
    ├── files.js                  # File-related IPC (~30 lines)
    ├── reviews.js                # Review-related IPC (~50 lines)
    └── utils.js                  # Utility IPC (~30 lines)
```

**Benefits:**
- Clear module boundaries
- Easy to locate and modify specific concerns
- Each file under 100 lines
- Reduced cognitive load
- Better testability (can mock/test modules independently)

---

## Token Efficiency Analysis

**Current state:**
- 564 lines in main.js
- ~140 lines of duplicated hegel spawn pattern
- ~16 lines of duplicated file reading
- Mixed concerns make navigation expensive

**After refactoring:**
- ~50 lines in main index.js
- ~390 lines across 9 focused modules
- ~110 lines saved from hegel extraction
- ~10 lines saved from file reading extraction
- Clear boundaries reduce context switching

**Net result:** 564 lines → ~440 lines across focused modules = **~120 lines saved** + improved maintainability

---

## Implementation Plan

### Phase 1: Extract DRY Violations (HIGH PRIORITY)
1. Create `src/main/hegel.js` with `runHegelCommand()` helper
2. Replace all 7 hegel spawn patterns with helper calls
3. Test all affected IPC handlers

### Phase 2: Split SoC by Module (MEDIUM PRIORITY)
4. Create `src/main/` directory
5. Extract terminal.js
6. Extract window.js
7. Extract http-server.js
8. Extract ipc-handlers/* modules
9. Create main index.js to orchestrate
10. Update imports and test

### Phase 3: Verify (HIGH PRIORITY)
11. Run full e2e test suite
12. Manual smoke test of all IPC operations

---

## Files to Create

- `src/main/index.js` - App entry point
- `src/main/window.js` - Window management
- `src/main/terminal.js` - Terminal operations
- `src/main/http-server.js` - HTTP server
- `src/main/hegel.js` - Hegel command helper (DRY)
- `src/main/ipc-handlers/projects.js` - Project IPC
- `src/main/ipc-handlers/terminals.js` - Terminal IPC
- `src/main/ipc-handlers/files.js` - File IPC
- `src/main/ipc-handlers/reviews.js` - Review IPC
- `src/main/ipc-handlers/utils.js` - Utility IPC

**Original file:** `src/main.js` will be replaced by above structure

---

## Risks and Considerations

**Low risk:**
- Pure refactoring, no functionality changes
- Comprehensive e2e test suite exists
- Clear module boundaries make rollback easy

**Considerations:**
- Must preserve exact behavior of all IPC handlers
- Must preserve error handling semantics
- Must maintain state sharing (mainWindow, ptyProcesses, httpPort)
