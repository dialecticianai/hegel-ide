# Markdown Browser: Phase 1 - Project README Rendering

First implementation of the Markdown browser (left panel's primary feature): render project README.md files with theme-aware styling.

## Overview

**What it does:** Implements foundational markdown rendering for the left panel by displaying project README.md files in project detail tabs. This is Phase 1 of building the document browser that is the core differentiator of Hegel IDE.

**Context - The Larger Vision:**
The left panel is designed to be a **Markdown browser/viewer** for document-driven workflows (SPEC.md, PLAN.md, ARCHITECTURE.md, README.md, etc.). This is the primary differentiator of Hegel IDE - not a side feature. The current JSON metrics display is temporary scaffolding. This phase establishes:
- Markdown rendering infrastructure (`marked` library integration)
- Theme system foundation (dark/light mode)
- File reading pattern (IPC handler for filesystem access)

These foundations will support future phases: document navigation, browsing .ddd/ directory structures, and the no-code review system.

**Key principles:**
- JSON metrics display remains (for now) but README is the primary content
- Theme system respects system dark/light mode preferences
- Clear feedback when README.md is missing or unreadable
- Refresh button updates both metrics and README content
- Build foundation that scales to full document browser

**Phase 1 Scope:** README.md rendering only. Single-file markdown display with theme support. No document navigation, no .ddd/ directory browsing, no review UI yet.

**Integration context:** Modifies existing project detail tab rendering in `index.html` and adds IPC handler in `main.js` for file reading. Integrates with existing `projectDetails` state management in `renderer.js`.

## Data Model

### MODIFIED: Project Detail State (renderer.js)

Existing state in Alpine component's `projectDetails` object:
```javascript
projectDetails: {
  [projectName]: {
    data: object,      // existing: hegel CLI JSON output
    loading: boolean,  // existing: fetch in progress
    error: string      // existing: error message
  }
}
```

Extended to:
```javascript
projectDetails: {
  [projectName]: {
    data: object,           // existing: hegel CLI JSON output
    loading: boolean,       // existing: fetch in progress
    error: string,          // existing: error message
    readme: string | null,  // NEW: markdown content or null if missing
    readmeError: string     // NEW: error message if README fetch failed
  }
}
```

### NEW: IPC Handler (main.js)

Handler name: `get-project-readme`

Input:
```javascript
{ projectPath: string }  // absolute path to project directory
```

Output on success:
```javascript
{ content: string }  // raw markdown content from README.md
```

Output on failure:
```javascript
{ error: string }  // error message (file not found, permission denied, etc.)
```

### NEW: Theme Detection (index.html CSS)

Use CSS media query `@media (prefers-color-scheme: dark)` and `@media (prefers-color-scheme: light)` to apply theme-appropriate styles to markdown content.

Markdown container will have class `.markdown-content` with theme-responsive CSS variables.

### NEW: Dependency (package.json)

Add `marked` library for markdown-to-HTML conversion.

## Core Operations

### Operation 1: Fetch Project README

**When:** Project detail tab is opened or refresh button is clicked

**Behavior:**
1. Extract `project_path` from existing hegel CLI project data
2. Request README via IPC: `ipcRenderer.invoke('get-project-readme', { projectPath })`
3. On success: Store markdown content in `projectDetails[projectName].readme`
4. On failure: Store null in `readme` field and error message in `readmeError`

**File path checked:** `${projectPath}/README.md` (exact filename, case-sensitive)

**Error handling:**
- File not found → treat as missing README (not an error state)
- Permission denied, I/O error → treat as missing README (not an error state)
- All failures result in displaying "Project missing README.md" message

### Operation 2: Render Markdown

**When:** README content is available in state

**Behavior:**
1. Convert markdown to HTML using `marked.parse(content)`
2. Render HTML in theme-aware container below JSON display
3. Apply sanitization (marked's default XSS protection is sufficient)

**Display order in project detail tab:**
1. Project name header with refresh button (existing)
2. Loading state or error state (existing)
3. JSON metrics in `<pre>` tag (existing, unchanged)
4. Horizontal separator or spacing
5. README section (new):
   - If content exists: Rendered markdown HTML
   - If missing: Gray text message "Project missing README.md"

### Operation 3: Theme Application

**When:** Page loads or system theme changes

**Behavior:**
1. CSS detects system preference via `prefers-color-scheme` media query
2. Markdown container (`.markdown-content`) applies theme-specific styles:
   - Dark mode: Light text on dark background, appropriate link colors
   - Light mode: Dark text on light background, appropriate link colors
3. Theme changes dynamically when system preference changes (no page reload)

**CSS approach:** Use CSS variables inside media queries to define theme colors, apply to markdown content.

## Test Scenarios

### Simple: Project with README.md

**Setup:**
1. Test project directory contains valid README.md file
2. Open project detail tab

**Expected:**
- JSON metrics display at top
- README.md content rendered as HTML below metrics
- Markdown formatting preserved (headers, lists, code blocks, links)
- Theme matches system preference

### Complex: Refresh Updates README

**Setup:**
1. Open project detail tab (README displays)
2. Externally modify README.md file content
3. Click refresh button

**Expected:**
- Both JSON metrics and README content refresh
- Updated README.md content appears after refresh completes
- Loading state shows during fetch

### Error: Missing README.md

**Setup:**
1. Test project directory has no README.md file
2. Open project detail tab

**Expected:**
- JSON metrics display normally at top
- Message "Project missing README.md" appears below metrics in gray text
- No error state (missing README is not an error condition)

### Error: Unreadable README.md

**Setup:**
1. README.md exists but has restricted permissions or I/O error
2. Open project detail tab

**Expected:**
- JSON metrics display normally
- Message "Project missing README.md" appears below metrics
- Treated same as missing file (graceful degradation)

## Success Criteria

**Agent-Verifiable:**
- `marked` dependency added to package.json
- `npm install` completes successfully after adding dependency
- IPC handler `get-project-readme` exists in main.js
- IPC handler returns content for existing README.md files
- IPC handler returns error for missing files
- Project detail tab HTML includes markdown rendering section
- CSS includes `@media (prefers-color-scheme: dark)` rules
- CSS includes `@media (prefers-color-scheme: light)` rules
- Refresh button triggers both metrics and README fetch
- Existing project detail functionality (JSON display) remains unchanged

**Optional Human Testing:**
- Markdown renders with proper formatting (headers, lists, code blocks)
- Theme colors are readable and aesthetically appropriate
- Theme switches smoothly when system preference changes
- README content is visually separated from JSON metrics

## Future Phases

This is Phase 1 of the Markdown Browser. Future phases will build on this foundation:

**Phase 2: .ddd/ Directory Navigation**
- Browse SPEC.md, PLAN.md, CODE.md, LEARNINGS.md within project's .ddd/ directory
- File tree or navigation UI for document browsing
- Replace JSON metrics view entirely (move to separate "Metrics" tab if needed)

**Phase 3: Document Navigation**
- Navigate between related documents (SPEC → PLAN → CODE)
- Breadcrumb navigation
- Back/forward history

**Phase 4: No-Code Review System**
- Inline annotations on markdown documents
- Review/approval workflow (like hegel-mirror but integrated)
- Comment threads on document sections

**Phase 5: Full Document Browser**
- Browse any .md file in project
- Search across documents
- Cross-document linking

This spec focuses on Phase 1 only. Each phase builds on the previous foundation.

## Out of Scope (Phase 1)

**Future phase features (not in Phase 1):**
- Document navigation UI or file tree
- Browsing .ddd/ directory contents
- Any markdown files besides README.md
- No-code review/annotation system
- Search or cross-document linking

**Advanced features (defer to later):**
- User theme selection override (system preference only for Phase 1)
- Custom theme colors or theme editor
- README.md variants (README, readme.md, Readme.md)
- Markdown preview/edit mode
- Syntax highlighting in code blocks (basic `<code>` rendering only)
- Table of contents generation
- README caching strategy (fetch on every tab open/refresh)
