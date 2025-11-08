# Markdown Link Navigation Specification

Markdown browser with proper link interception and tab-aware navigation.

## Overview

**What it does:** Intercepts markdown link clicks in rendered content to enable browser-like tab navigation within the IDE's markdown viewer.

**Key principles:**
- Browser-standard navigation: regular click navigates current tab, modifier+click opens new tab
- Tab deduplication: files can only be open once across all tabs
- Position preservation: navigation maintains tab order in the tab bar
- Protocol awareness: only intercept relative markdown links, allow external links to pass through

**Scope:** Handles `.md` file links in project README and file tab content. Does not handle non-markdown files, images, or anchors to non-existent sections.

**Integration context:** Extends existing tab system (`renderer.js::splitPane` Alpine component) and markdown rendering (`renderer.js::renderMarkdown`). Uses existing `fetchProjectFile` IPC for content loading.

## Data Model

### Tab Object (MODIFIED)
Modified tab types in `renderer.js::leftTabs` array to support file navigation:

**project-detail tabs** (now treated as special case of file tabs showing README.md):
```javascript
{
  id: 'project-myproject',          // Unique tab identifier
  type: 'project-detail',            // Tab type
  label: 'myproject',                // Display label
  closeable: false,                  // Can't close projects tab
  projectName: 'myproject'           // Associated project
}
```

**file tabs** (NEW):
```javascript
{
  id: 'file-myproject-SPEC.md',     // Deterministic: file-{project}-{path with / as -}
  type: 'file',                      // Tab type
  label: 'SPEC.md',                  // File basename
  closeable: true,                   // User can close
  projectName: 'myproject',          // Associated project
  filePath: 'SPEC.md'                // Relative path from project root
}
```

### File Content Cache (NEW)
Added `fileContents` cache in `renderer.js::splitPane`:

```javascript
fileContents: {
  'myproject:SPEC.md': {
    content: '# Spec\n...',   // Raw markdown content
    loading: false,            // Fetch in progress
    error: null                // Error message if fetch failed
  }
}
```

**Key:** `{projectName}:{filePath}`
**Purpose:** Deduplicate file fetches, persist content across tab switches

## Core Operations

### Link Click Handling
**Location:** `renderer.js::handleMarkdownClick(event, tabId, projectName)`

**Behavior:**
1. Walk DOM from click target to find nearest `<a>` ancestor
2. Filter: skip absolute URLs (http://, https://, mailto:, etc.)
3. Filter: skip non-markdown files (must match `\.md(#.*)?$`)
4. Parse: extract filePath and hash anchor from href
5. Detect modifier keys: metaKey, ctrlKey, shiftKey, or middle-click (button === 1)
6. Execute navigation logic based on modifier state

**Regular Click (no modifiers):**
- Check if target file already open → switch to existing tab, close current tab
- Otherwise → create new tab at current position, close current tab
- Result: simulates in-place navigation with tab ID switch

**Modifier Click (Cmd/Ctrl/Shift/Middle):**
- Open target file in new tab (via `openFileTab`)
- Keep current tab open
- Result: preserves current context while opening new view

**Hash handling:** If href contains `#section`, scroll to element with that ID after content loads

### File Tab Creation
**Location:** `renderer.js::openFileTab(projectName, filePath, hash)`

**Behavior:**
1. Generate deterministic tab ID: `file-{projectName}-{filePath with / as -}`
2. Check for existing tab with same ID → switch to it if found
3. Otherwise create new tab with type='file', label=basename(filePath)
4. Fetch content if not in cache (via `fetchFileContent`)
5. Scroll to hash if provided

**Deduplication:** Same file can never be open twice due to deterministic IDs

### Content Fetching
**Location:** `renderer.js::fetchFileContent(projectName, filePath)`

**Behavior:**
1. Set cache entry to loading state
2. Call existing `fetchProjectFile` helper (uses 'get-project-file' IPC)
3. Update cache with content or error
4. Alpine reactivity updates UI automatically

## Test Scenarios

### Simple
- Click markdown link `[PLAN](PLAN.md)` in README → opens PLAN.md in new tab at same position, closes README tab
- Cmd+Click same link → opens PLAN.md in new tab, keeps README tab open

### Complex
- Open SPEC.md → navigate to PLAN.md → navigate to ARCHITECTURE.md
- Result: 3 sequential tabs at same position with deterministic IDs
- Click link to SPEC.md from ARCHITECTURE.md → switches back to existing SPEC.md tab, closes ARCHITECTURE.md tab

- Open README (tab position 2 of 5) → click link
- Result: new file tab opens at position 2, README closes, tab count stays at 5

### Error
- Click link to nonexistent file → new tab opens with error message from IPC layer
- Click external link `https://example.com` → default Electron behavior (opens in system browser)
- Click non-markdown link `./image.png` → default behavior (no interception)

## Success Criteria

- Markdown links in project-detail tabs and file tabs trigger `handleMarkdownClick`
- Regular clicks on markdown links create new file tab and close source tab
- Cmd/Ctrl/Shift/middle clicks open new tab without closing source
- Same file opened twice reuses existing tab (no duplicates)
- Tab position preserved during navigation (new tab at old tab's index)
- External links (http://, https://, mailto:) not intercepted
- Non-markdown relative links not intercepted
- File content cached by `{project}:{path}` key
- Hash anchors scroll to target element after content loads

## Out of Scope

- Navigation history (back/forward buttons)
- Non-markdown file rendering (images, PDFs, code files)
- Cross-project link handling
- Link validation before navigation
- Broken anchor handling (hash to nonexistent ID)
- Tab reordering or manual organization
