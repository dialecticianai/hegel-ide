# Markdown Review Tab Specification

Enable inline review of markdown documents with selection-based commenting and a persistent comment margin.

---

## Overview

**What it does:** Provides a dedicated review interface for markdown files where users can select text blocks and add comments that appear in a right-hand margin, aligned to the blocks they reference. Comments are submitted in batches and persisted via hegel CLI integration.

**Key principles:**
- Grid-based layout leverages DOM for alignment and scrolling
- Block-level selection granularity (paragraphs, headings, code blocks, lists, tables)
- Comments stored with line number ranges for compatibility with Mirror
- Batched submission model (queue in memory, save on submit)
- Clean separation between read-only file viewer and review interface

**Scope:** Two related changes:
1. Refactor `type: 'file'` tabs to use absolute file paths (breaking change from current project-scoped implementation)
2. Add new `type: 'review'` tabs with selection + commenting UI

**Integration context:**
- Extends existing tab system in `src/renderer/tabs.js`
- New line-tracking module extracted as pure functions (independently testable with vitest)
- Alpine.js components use line-tracking module for review tab rendering
- Existing `renderMarkdown()` in `src/renderer/markdown.js` unchanged (file tabs remain compatible)
- Integrates with hegel CLI via new IPC handlers in `src/main.js`
- Compatible with Mirror's review format (`.hegel/reviews.json`)

---

## Data Model

### Tab Structures

**File Tab (MODIFIED)**
```javascript
{
  id: 'file-<unique-id>',
  type: 'file',
  label: 'SPEC.md',
  closeable: true,
  filePath: '/absolute/path/to/SPEC.md'  // NEW: absolute path only
  // REMOVED: projectName, old relative path pattern
}
```

**Review Tab (NEW)**
```javascript
{
  id: 'review-<unique-id>',
  type: 'review',
  label: 'SPEC.md',
  closeable: true,
  filePath: '/absolute/path/to/SPEC.md',
  projectPath: '/absolute/path/to/project',  // Optional, for hegel integration
  pendingComments: [                         // In-memory comment queue
    {
      lineStart: 10,
      lineEnd: 15,
      selectedText: 'Paragraph excerpt...',
      comment: 'This needs clarification',
      timestamp: '2025-01-10T19:30:00Z'
    }
  ],
  marginCollapsed: false  // Comment margin visibility state
}
```

### Rendered Block Structure (NEW)

Each markdown block is wrapped with line tracking metadata (using `marked.lexer()` for line extraction):

```javascript
// Rendered output structure
{
  type: 'paragraph',  // or 'heading', 'code', 'list', 'table', etc.
  lineStart: 10,
  lineEnd: 15,
  html: '<p>Rendered content...</p>'
}
```

**Implementation validated**: See `.ddd/toys/toy3_markdown_line_tracking/` for proven approach using marked.lexer token.raw for line tracking.

### Review Persistence Format

Comments saved via hegel CLI must match Mirror's format:

```json
{
  "file": "SPEC.md",
  "comments": [
    {
      "line_start": 10,
      "line_end": 15,
      "selected_text": "Paragraph excerpt...",
      "comment": "This needs clarification",
      "timestamp": "2025-01-10T19:30:00Z",
      "session_id": "optional-session-id"
    }
  ]
}
```

**Hegel CLI integration**: Exact command syntax (TBD). Will use pattern similar to existing hegel commands in `src/main.js` - spawn process, write JSON to stdin, parse stdout response.

---

## Core Operations

### 1. Open File Tab

**Behavior**: Display markdown file in read-only mode with standard rendering.

**Parameters**:
- `filePath` (string, required): Absolute path to markdown file

**Example**:
```javascript
// Programmatic open (from tests)
await ipcRenderer.invoke('open-file-tab', {
  filePath: '/Users/test/project/SPEC.md'
});
```

**Validation**:
- File path must be absolute
- File must exist and be readable
- File must have `.md` extension

**State changes**:
- New tab added to `leftTabs` array
- File content loaded into `fileContents` map
- Tab becomes active

### 2. Open Review Tab

**Behavior**: Display markdown file with grid layout (content area + comment margin), enable text selection and commenting.

**Parameters**:
- `filePath` (string, required): Absolute path to markdown file
- `projectPath` (string, optional): Project root for hegel integration

**Example**:
```javascript
await ipcRenderer.invoke('open-review-tab', {
  filePath: '/Users/test/project/SPEC.md',
  projectPath: '/Users/test/project'
});
```

**Validation**:
- Same as file tab (absolute path, exists, readable, .md extension)
- If `projectPath` provided, must contain `.hegel/` directory

**State changes**:
- New review tab added with empty `pendingComments` array
- Markdown rendered with block-level line tracking
- Comment margin initialized (collapsed initially)

### 3. Select Text and Create Comment

**Behavior**: User selects text within a markdown block. Comment input form appears in the margin aligned to that block. User types comment and saves to queue.

**Selection detection**:
- Browser's `window.getSelection()` captures selected text
- Walk DOM ancestors to find containing `.markdown-block` element
- Extract `data-line-start` and `data-line-end` attributes from block
- Extract selected text content

**Comment form**:
- Appears in comment margin for the selected block's row
- Pre-populates with selected text (read-only snippet)
- User enters comment text
- Save button adds to `pendingComments` queue
- Cancel button dismisses form

**State changes**:
- Comment added to tab's `pendingComments` array
- Comment card rendered in margin (stacked if multiple exist)
- Margin auto-expands if collapsed
- Selection cleared

### 4. Submit Review

**Behavior**: All pending comments are sent to hegel CLI for persistence, then cleared from queue.

**Invocation**: User clicks "Submit Review" button in review tab.

**Hegel CLI interaction** (exact syntax TBD):
- Spawn hegel process with review data
- Write JSON payload to stdin
- Parse success/error response from stdout
- Handle errors gracefully (show error message, preserve pending comments)

**State changes on success**:
- `pendingComments` array cleared
- Comment margin auto-collapses
- Success message displayed briefly

**State changes on error**:
- Pending comments preserved
- Error message displayed
- User can retry or edit comments

### 5. Cancel Review

**Behavior**: Discard all pending comments without saving.

**Invocation**: User clicks "Cancel Review" button.

**Confirmation**: Show confirmation dialog if pending comments exist.

**State changes**:
- `pendingComments` array cleared
- Comment margin collapses
- All comment cards removed

---

## UI Layout

### File Tab Layout (type: 'file')

Simple scrollable content area (existing pattern):
```
┌─────────────────────────┐
│ File: SPEC.md           │
├─────────────────────────┤
│                         │
│  # Heading              │
│                         │
│  Paragraph text...      │
│                         │
│  ```code```             │
│                         │
└─────────────────────────┘
```

### Review Tab Layout (type: 'review')

Grid with content area and collapsible comment margin:
```
┌────────────────────┬────────────────┐
│ Review: SPEC.md    │   [Submit]     │
├────────────────────┼────────────────┤
│                    │                │
│  # Heading         │                │
│                    │                │
├────────────────────┼────────────────┤
│  Paragraph text... │ ┌────────────┐ │
│  [selected text]   │ │ Comment 2  │ │
│                    │ └┬───────────┘ │
│                    │  │ Comment 1  │ │
│                    │  └────────────┘ │
├────────────────────┼────────────────┤
│  ```code```        │                │
│                    │                │
└────────────────────┴────────────────┘
```

**Comment stacking**:
- Multiple comments on same block appear as overlapping cards
- Slight x/y offset creates visual stack
- Most recent comment has highest z-index (appears on top)
- Clicking visible edge of lower card brings it to top

**Margin behavior**:
- Collapsed (hidden) by default
- Auto-expands when first comment is created
- Auto-collapses after successful submit
- Can be manually toggled via collapse/expand button
- Fixed width (e.g., 300px) when expanded

---

## Test Scenarios

### Simple: Open file tab and render markdown

1. Create test markdown file at absolute path
2. Invoke `open-file-tab` IPC handler with file path
3. Verify tab appears in leftTabs with correct label
4. Verify markdown content renders (headings, paragraphs, code blocks visible)
5. Verify no comment margin exists

**Validation**: File tab displays read-only markdown content

---

### Complex: Create and submit review with multiple comments

1. Create test markdown file with multiple blocks
2. Open review tab for file
3. Verify grid layout renders with collapsed comment margin
4. Select text in first paragraph block
5. Verify comment form appears in margin aligned to block
6. Enter comment text and save
7. Verify comment card appears in margin, margin expands
8. Select text in code block
9. Add second comment
10. Verify both comments exist in pendingComments queue
11. Click Submit Review button
12. Verify hegel CLI invoked with correct JSON payload
13. Mock successful response
14. Verify pendingComments cleared and margin collapsed

**Validation**: Multi-block review workflow completes successfully

---

### Error: Handle hegel CLI failure gracefully

1. Open review tab and create comments
2. Click Submit Review
3. Mock hegel CLI error response
4. Verify error message displayed to user
5. Verify pending comments preserved (not cleared)
6. Verify user can retry submission

**Validation**: Review submission errors don't lose user data

---

### Integration: File tab to review tab conversion

1. Open file tab for markdown file
2. Add "Open in Review Mode" action to file tab
3. Click action
4. Verify new review tab opens for same file
5. Verify original file tab remains open (both can coexist)

**Validation**: Users can switch between read-only and review modes

---

## Success Criteria

**Agent-verifiable criteria:**

- E2E tests pass: `npm test`
- Build succeeds: `npm run build`
- File tab opens with absolute path, renders markdown content
- Review tab opens, displays grid layout with content + margin
- Text selection within block triggers comment form in correct margin row
- Comment form saves to pendingComments queue
- Multiple comments on same block stack with z-index ordering
- Submit button invokes hegel CLI with correct JSON structure
- Successful submit clears pendingComments and collapses margin
- Failed submit preserves pendingComments and shows error
- Cancel button clears pendingComments with confirmation dialog
- Margin collapse/expand toggle works correctly
- Existing `type: 'file'` tests updated for absolute path pattern (breaking change)

**Optional Human Testing:**

- Comment stacking visual appearance (overlapping cards look clean)
- Margin alignment feels natural during scrolling
- Grid layout doesn't cause layout shifts or jank
- Comment form UX feels responsive and intuitive

---

## Out of Scope

**Deferred to future iterations:**

- Loading and displaying existing reviews from `.hegel/reviews.json`
- File picker UI for opening arbitrary files (programmatic open only for MVP)
- Drag-and-drop file opening
- Approval/rejection workflow buttons
- Line-level selection precision (block-level sufficient for MVP)
- Comment editing after submission
- Multi-file review sessions
- Keyboard shortcuts for review actions
- Export reviews to other formats
- Real-time collaboration features
