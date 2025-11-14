# Markdown Document Tree Navigation Specification

Add compact document tree above README for quick navigation within project markdown files.

## Overview

**What it does:** Displays a terminal-styled tree of "Other Documents" (non-DDD markdown files) in project detail tabs, positioned above the README content. Users can navigate by clicking files in the tree.

**Key principles:**
- Terminal aesthetic with box-drawing characters matching `hegel md` output
- Minimal UI footprint: 3-line max-height with scroll overflow
- Auto-scroll tree to show currently displayed file
- Lazy-loaded on first project tab open
- Click replaces inline content, Cmd+Click opens new tab

**Scope:** Non-DDD markdown files only (`.md` files outside `.ddd/` directory). DDD artifacts deferred to future feature.

**Integration context:**
- Extends existing project detail tabs (index.html:93-142)
- Uses `hegel md --no-ddd --json --state-dir <project_path>` for data
- Integrates with existing file tab navigation system (lib/tabs.js)

## Data Model

### Input: `hegel md --no-ddd --json` Output

Existing data structure from hegel CLI:

```json
{
  "other_markdown": [
    {
      "path": "ARCHITECTURE.md",
      "lines": 256,
      "size_bytes": 8428,
      "last_modified": "2025-11-07T04:10:48.427120041+00:00",
      "ephemeral": false
    },
    {
      "path": "lib/README.md",
      "lines": 46,
      "size_bytes": 1389,
      "last_modified": "2025-11-08T02:39:44.622447857+00:00",
      "ephemeral": false
    }
  ]
}
```

**Fields used:**
- `path` - file path relative to project root
- `lines` - line count displayed in tree

**Fields ignored for MVP:** `size_bytes`, `last_modified`, `ephemeral`

### NEW: Tree Node Structure

Client-side tree built from flat path array:

```javascript
{
  type: 'file' | 'directory',
  name: 'README.md',
  path: 'lib/README.md',      // Full path (files only)
  lines: 46,                    // Line count (files only)
  children: []                  // Child nodes (directories only)
}
```

### MODIFIED: `projectDetails[projectName]`

Add `markdownTree` property to existing project details state (lib/projects.js:16):

```javascript
this.projectDetails[projectName] = {
  data: {...},               // Existing
  loading: false,            // Existing
  error: null,               // Existing
  readme: null,              // Existing
  readmeError: null,         // Existing
  markdownTree: null,        // NEW: Tree data
  markdownTreeLoading: false,// NEW: Loading state
  markdownTreeError: null    // NEW: Error state
}
```

### NEW: IPC Handler

Add `get-markdown-tree` handler in main.js:

```javascript
ipcMain.handle('get-markdown-tree', async (event, { projectPath }) => {
  // Spawn: hegel md --no-ddd --json --state-dir <projectPath>
  // Return: { other_markdown: [...] } or throw error
})
```

**Pattern:** Follow existing `get-project-details` handler (main.js:95-127)

## Core Operations

### 1. Fetch Markdown Tree

**When:** Project detail tab activated AND tree not yet loaded

**Command:**
```bash
hegel md --no-ddd --json --state-dir <project_path>
```

**Parameters:**
- `projectPath` - from `projectDetails[projectName].data.project_path`

**Behavior:**
- Set `markdownTreeLoading = true`
- Invoke IPC handler with project path
- Parse JSON response
- Build tree structure from flat paths
- Set `markdownTree` with result
- Set `markdownTreeLoading = false`

**Validation:**
- If `hegel` command fails, set `markdownTreeError` with message
- If JSON parse fails, set error
- If `other_markdown` array empty, set `markdownTree = []` (valid empty state)

### 2. Render Tree

**Format:** Terminal-style tree with box-drawing characters

**Example output:**
```
Other Documents:
├── ARCHITECTURE.md (256 lines)
├── README.md (151 lines)
├── VISION.md (125 lines)
├── lib/
│   └── README.md (46 lines)
└── e2e/
    └── README.md (77 lines)
```

**Rendering rules:**
- Use `├──` for intermediate items, `└──` for last item
- Use `│   ` for vertical continuation in nested directories
- Show `(N lines)` for files only
- Directories: `dirname/` with trailing slash
- Currently displayed file: highlighted/bolded

**Styling:**
- Monospace font matching terminal
- Files styled as clickable links (default theme link color + underline on hover)
- Directories not clickable (plain text)
- Max-height: 3 lines of text
- Overflow: vertical scroll
- Auto-scroll: currently displayed file visible in middle (or top/bottom if near edges)

### 3. Navigate on Click

**Simple click:**
- Find/create file tab with `{ type: 'file', projectName, filePath }`
- Replace README content with clicked file content
- Update tree highlighting to show new active file
- Auto-scroll tree to keep active file visible

**Cmd+Click:**
- Open new file tab (don't replace README)
- Switch to new tab
- Same highlighting/scroll behavior

**File loading:**
- Reuse existing `fetchProjectFile(projectName, fileName)` (lib/projects.js:61-81)
- Display loading state while fetching
- Show error if file read fails

## Test Scenarios

### Simple: Click File in Root

**Given:** Project detail tab open, tree loaded with root-level markdown file (e.g., `VISION.md`)

**When:** User clicks `VISION.md` in tree

**Then:**
- README content replaced with `VISION.md` content
- `VISION.md` highlighted in tree
- Tree auto-scrolls to show `VISION.md` (if needed)

### Complex: Cmd+Click Nested File

**Given:** Project detail tab open, tree loaded with nested file (e.g., `lib/README.md`)

**When:** User Cmd+Click `lib/README.md` in tree

**Then:**
- New file tab created with label `lib/README.md`
- Tab switched to new file tab
- File content rendered as markdown
- Tree highlights `lib/README.md`
- Tree auto-scrolls to show highlighted file

### Error: Hegel Command Fails

**Given:** Project detail tab open, `hegel md` command not available or fails

**When:** Tree fetch attempted

**Then:**
- Error message displayed: "Failed to load document tree: <error>"
- README content still visible below
- No tree UI rendered

## Success Criteria

- `hegel md --no-ddd --json --state-dir <path>` invoked correctly via IPC
- Tree builds from flat path array into hierarchical structure
- Tree renders with box-drawing characters matching `hegel md` output
- Click navigation replaces README inline
- Cmd+Click navigation opens new file tab
- Currently displayed file highlighted in tree
- Tree auto-scrolls to keep current file visible within 3-line viewport
- Loading state shows "Fetching document tree..." with subtle animation
- Errors display gracefully without breaking project detail UI
- Empty tree (no markdown files) displays: "No other documents found"

## Optional Human Testing

- Tree scroll behavior feels natural (current file centered when possible)
- Box-drawing characters render cleanly across themes
- Loading animation is subtle and non-distracting
- 3-line height provides useful overview without dominating UI

## Out of Scope

- DDD artifacts (`.ddd/` directory) - deferred to next feature
- Collapsible/expandable directories - always fully expanded for MVP
- Sorting or filtering tree entries
- Drag-and-drop file reordering
- Right-click context menus
- File creation/deletion/renaming
- Display of `size_bytes`, `last_modified`, `ephemeral` metadata
- Performance optimization for projects with 100+ markdown files
