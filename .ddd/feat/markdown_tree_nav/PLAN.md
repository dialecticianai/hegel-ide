# Markdown Document Tree Navigation - Implementation Plan

## Overview

Build compact document tree navigation for project detail tabs that displays markdown files in terminal-styled tree format above README content. Implementation follows existing patterns: IPC handlers in main.js, state management in lib/projects.js, UI in index.html.

**Scope**: Core tree display and navigation functionality. Auto-scroll to current file deferred to iterative polish (difficult to test reliably in e2e).

**Priorities**:
1. Backend data fetching via hegel CLI
2. Tree structure building from flat paths
3. Terminal-styled rendering with box-drawing characters
4. Click navigation with inline replace and Cmd+Click for new tabs

## Methodology

**TDD Approach**: Test tree building logic (flat paths to hierarchy). UI rendering and interaction verified manually during development - automated UI testing deferred as non-essential for MVP.

**Commit Strategy**: Logical feature units, not per-step micro-commits. Group scaffolding and trivial changes, separate substantial implementation.

---

## Step 1: Backend IPC Handler

### Goal
Add IPC handler to fetch markdown tree data using hegel CLI with project-specific state directory.

### Step 1.a: Write Tests
Execution mode guidance: Backend IPC handlers follow existing patterns without specific unit tests. Manual verification via UI interaction drives development.

### Step 1.b: Implement
Add new IPC handler in main.js following the pattern of get-project-details handler. Handler accepts project path parameter, spawns hegel command with state-dir flag, parses JSON output, returns markdown file array or error.

Key tasks:
- Register handler for get-markdown-tree event
- Spawn hegel md command with no-ddd, json, and state-dir flags
- Collect stdout and stderr streams
- Parse JSON response on successful exit
- Return other_markdown array or reject with error message
- Handle command spawn failures gracefully

### Success Criteria
- Handler registered and invocable via IPC
- Hegel command spawned with correct flags including state-dir
- JSON output parsed and returned to renderer
- Errors propagated with descriptive messages
- Pattern matches existing get-project-details handler

**Commit Point:** `feat(markdown-tree): add IPC handler for hegel md command`

---

## Step 2: Frontend State and Tree Building

### Goal
Add state management for tree data and implement logic to transform flat file paths into hierarchical tree structure.

### Step 2.a: Write Tests
Test tree building function with sample flat paths to verify correct hierarchy generation. Test cases cover root files, nested directories, mixed depth levels.

Test validation:
- Single root file creates single file node
- Multiple root files create flat list
- Nested paths create directory nodes with children
- Sibling files within directories ordered correctly
- Empty input produces empty tree

### Step 2.b: Implement
Extend projectDetails state object with markdown tree properties. Add function to fetch tree data via IPC. Implement tree building algorithm that parses slash-separated paths into nested directory and file nodes.

Key tasks:
- Add markdownTree, markdownTreeLoading, markdownTreeError to project details state
- Create fetchMarkdownTree function in lib/projects.js
- Implement buildTreeFromPaths function that converts flat array to hierarchy
- Handle path splitting and directory grouping
- Preserve line count metadata on file nodes
- Invoke tree fetch when project detail tab first activated

State shape:
- File nodes include name, path, lines, type
- Directory nodes include name, children array, type
- Tree root is array of top-level nodes

### Success Criteria
- State properties added to projectDetails schema
- fetchMarkdownTree invokes IPC handler and updates state
- buildTreeFromPaths creates correct hierarchy from flat paths
- Tests pass for tree building logic
- Loading and error states managed correctly

**Commit Point:** `feat(markdown-tree): add state management and tree building logic`

---

## Step 3: UI Rendering with Terminal Styling

### Goal
Display tree in project detail UI with box-drawing characters, monospace font, and compact three-line viewport.

### Step 3.a: Write Tests
E2E test verifies tree renders with box-drawing characters, correct directory and file formatting, and three-line height constraint.

Test validation:
- Tree section visible above README in project detail tab
- Box-drawing characters present in tree output
- Directories formatted with trailing slash
- Files formatted with line count suffix
- Container has three-line max height with overflow scroll
- Loading state displays before tree loaded
- Empty state displays when no markdown files exist

### Step 3.b: Implement
Add document tree section to project detail template above README content. Implement rendering function that walks tree nodes and generates terminal-styled output with Unicode box-drawing characters. Style section with monospace font, three-line max height, vertical scroll overflow.

Key tasks:
- Add tree section to index.html above README display
- Create renderMarkdownTree function that walks tree recursively
- Generate box-drawing characters based on node position (intermediate vs last child)
- Handle directory vertical continuation for nested items
- Format file entries with line count suffix
- Format directory entries with trailing slash
- Apply CSS for monospace font, height constraint, scroll behavior
- Show loading state while fetching
- Show error state if fetch fails
- Show empty state if no markdown files found

Rendering details:
- Use intermediate connector for non-last children
- Use last-child connector for final children
- Indent nested levels with vertical bar or whitespace based on ancestor positions
- Preserve consistent spacing for alignment

### Success Criteria
- Tree section appears above README in project detail tabs
- Box-drawing characters match hegel md CLI output format
- Directories display with trailing slash
- Files display with line count in parentheses
- Three-line max height with scroll overflow works
- Loading state shows "Fetching document tree..." message
- Error state displays gracefully
- Empty state shows "No other documents found"
- Monospace font applied consistently

**Commit Point:** `feat(markdown-tree): add tree rendering with terminal styling`

---

## Step 4: Navigation and Interaction

### Goal
Enable click navigation with inline README replacement and Cmd+Click for new tab opening. Add link styling to files and auto-scroll to current file.

### Step 4.a: Write Tests
E2E tests verify click navigation, tab creation, highlighting, and link styling.

Test validation:
- Clicking file in tree replaces README content with file content
- Cmd+Click creates new file tab and switches to it
- File nodes have link styling (cursor pointer, theme link color)
- Directory nodes not clickable (plain text styling)
- Currently displayed file highlighted in tree
- File content rendered correctly after navigation

### Step 4.b: Implement
Add click handlers to file nodes that detect modifier keys. Simple click replaces README content inline by fetching file and updating displayed content. Cmd+Click creates new file tab and switches to it. Add CSS to style files as links with hover states. Implement current file highlighting.

Key tasks:
- Attach click handlers to file nodes in tree
- Detect Cmd key modifier on click events
- Implement inline content replacement for simple clicks
- Create new file tabs for Cmd+Clicks
- Reuse existing fetchProjectFile function for file loading
- Add CSS for link styling on file nodes (default theme link color, underline on hover)
- Leave directory nodes as plain text (not clickable)
- Determine currently displayed file from active tab context
- Apply highlighting style to current file node

Auto-scroll deferred: Automatic scroll-to-current-file within three-line viewport deferred to iterative polish (complex e2e testing requirements).

### Success Criteria
- Clicking file in tree loads content inline
- Cmd+Click opens new file tab
- File content fetched and rendered as markdown
- Files styled as clickable links with monospace font
- Directories remain plain text
- Currently displayed file highlighted in tree
- Link hover states work across themes
- E2E tests pass for navigation and highlighting

**Commit Point:** `feat(markdown-tree): add navigation and interaction`

---

## Final Validation

After all steps complete, verify via automated tests:

- Unit tests pass for tree building logic
- E2E tests pass for tree rendering and navigation
- All commit points completed with clean git history
