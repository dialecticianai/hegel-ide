# Split-Pane Layout Specification

Two-panel layout with draggable divider: Markdown browser (left) + Terminal (right).

---

## Overview

**What it does**: Implements adjustable left-right split-pane layout with draggable divider, replacing current single-terminal layout.

**Key principles**:
- Simple layout mechanics: render, drag, resize
- Persistent split position across sessions
- Left panel shows discovered projects (via `hegel pm discover list --json`)
- Right panel keeps existing terminal functionality
- Defensive coding without edge case obsession

**Scope**:
- Split-pane HTML/CSS structure
- Draggable divider with mouse events
- localStorage persistence for split position
- Left panel: project list placeholder ("Markdown browser goes here")
- Right panel: existing terminal (no changes to terminal logic)

**Integration context**:
- Modifies `index.html` structure significantly
- Existing terminal code in `renderer.js` continues to work
- Sets foundation for future markdown viewer implementation
- No changes to `main.js` (terminal IPC stays the same)

---

## Data Model

### localStorage Schema

**Key**: `hegel-ide:split-position`

**Value** (JSON string):
```json
{
  "leftPanelPercent": 60
}
```

- `leftPanelPercent` (number): Percentage width of left panel (0-100)
- Default: 60 (60% left panel, 40% right panel)

### Runtime State (Alpine.js)

**Component**: `x-data="splitPane"`

```javascript
{
  leftPanelPercent: 60,        // number: current split position (0-100)
  isDragging: false,           // boolean: divider drag in progress
  projects: [],                // array: discovered hegel projects
  projectsLoading: true,       // boolean: loading project list
  projectsError: null          // string|null: error message if hegel command fails
}
```

### Hegel CLI Output

**Command**: `hegel pm discover list --json`

**Output structure** (existing, reference only):
```json
{
  "projects": [
    {
      "name": "hegel-pm",
      "project_path": "/path/to/project",
      "last_activity": "2025-11-07T17:12:47.120614665+00:00",
      "has_state": true
    }
  ],
  "total_count": 8,
  "cache_used": true
}
```

**We extract**: `projects[].name` for display

---

## Core Operations

### Operation: Render Split-Pane Layout

**Behavior**:
- Replace single `#terminal-container` with split-pane structure
- Left panel contains project list UI
- Right panel contains terminal (existing `#terminal-container` moved here)
- Divider positioned at saved percentage (or 60% default)
- Both panels visible on launch

**HTML Structure** (new):
```html
<div id="app" x-data="splitPane" class="split-container">
  <!-- Left Panel -->
  <div class="split-pane left-pane" :style="{ width: leftPanelPercent + '%' }">
    <h2>Markdown Browser</h2>
    <p>Discovered Projects:</p>
    <ul>
      <template x-for="project in projects" :key="project">
        <li x-text="project"></li>
      </template>
    </ul>
    <p x-show="projectsLoading">Loading projects...</p>
    <p x-show="projectsError" class="error" x-text="projectsError"></p>
  </div>

  <!-- Draggable Divider -->
  <div class="divider"
       @mousedown="startDrag"
       :class="{ 'dragging': isDragging }">
  </div>

  <!-- Right Panel (Terminal) -->
  <div class="split-pane right-pane" :style="{ width: (100 - leftPanelPercent) + '%' }">
    <div id="terminal-container"></div>
  </div>
</div>
```

**Validation**:
- Both panels render
- Divider appears between panels
- Terminal initializes in right panel

---

### Operation: Drag Divider to Resize

**Syntax**: User clicks and drags divider element

**Behavior**:
1. `mousedown` on divider: Set `isDragging = true`
2. `mousemove` on window: Calculate new split position from mouse X coordinate
3. Update `leftPanelPercent` reactively (Alpine updates both panel widths via `:style`)
4. `mouseup` on window: Set `isDragging = false`, persist position to localStorage

**Example**:
- User clicks divider at 60% position
- Drags left to 40% position
- Releases mouse
- Left panel now 40% width, right panel 60% width
- Position saved to localStorage

**Validation**:
- Divider follows mouse during drag
- Panels resize smoothly
- Split position clamped to reasonable bounds (e.g., 20-80%)

---

### Operation: Load Discovered Projects

**Syntax**: On app launch, execute `hegel pm discover list --json`

**Behavior**:
1. Set `projectsLoading = true`
2. Spawn `hegel pm discover list --json` via IPC or child_process
3. Parse JSON output
4. Extract `projects[].name` array
5. Set `projects = [names]`, `projectsLoading = false`
6. If command fails, set `projectsError = "Error message"`, `projectsLoading = false`

**Example Output**:
```
Discovered Projects:
- hegel-pm
- hegel-cli
- hegel-ide
- legacy-java
```

**Validation**:
- Projects list appears after load
- Loading state shows while command runs
- Error state shows if command fails

---

### Operation: Persist Split Position

**Syntax**: Automatically save to localStorage after drag ends

**Behavior**:
- On `mouseup` after drag, write current `leftPanelPercent` to localStorage
- Key: `hegel-ide:split-position`
- Value: JSON stringified `{ leftPanelPercent: 60 }`

**Restoration**:
- On app launch, read from localStorage
- If key exists, parse JSON and set `leftPanelPercent`
- If key missing or parse error, use default (60%)

**Validation**:
- Drag divider to new position
- Reload app (Cmd+R or relaunch)
- Split position restored to dragged position

---

## Test Scenarios

### Simple: Layout Renders

1. Launch app (`npm start`)
2. Verify left panel visible with "Markdown Browser" heading
3. Verify right panel visible with terminal
4. Verify divider visible between panels
5. Verify both panels have non-zero width

**Expected**: Split layout renders, all elements present

---

### Complex: Drag and Persist

1. Launch app
2. Observe initial split (should be 60/40 by default)
3. Click and hold divider
4. Drag left to approximately 40% position
5. Release mouse
6. Verify left panel now narrower (~40%), right panel wider (~60%)
7. Reload app (Cmd+R)
8. Verify split position restored to ~40%

**Expected**: Drag resizes panels, position persists across reload

---

### Error: Hegel Command Unavailable

1. Temporarily rename `hegel` binary or remove from PATH
2. Launch app
3. Verify left panel shows error message (not crash)
4. Verify terminal still functional in right panel

**Expected**: Graceful error handling, app remains usable

---

## Success Criteria

Agent-verifiable:
- App launches with split layout: `npm start` succeeds, window renders
- Left panel exists: Element with class `.left-pane` present
- Right panel exists: Element with class `.right-pane` present
- Divider exists: Element with class `.divider` present
- Terminal still works: Can execute `echo test` in right panel
- Split position persists: localStorage contains `hegel-ide:split-position` key after drag
- Project list populates: Left panel contains list items from `hegel pm discover` output

---

## Out of Scope

**Deferred to future features**:
- Minimum/maximum pane width constraints
- Responsive behavior for tiny windows
- Keyboard navigation for divider
- Snap-to positions (e.g., 50%, 75%)
- Vertical split or multi-pane layouts
- Actual markdown rendering (left panel is placeholder)
- Project selection/navigation (just display list)
- Performance optimization for drag (throttling/debouncing)

**Explicitly out**:
- Multiple windows
- Cross-window state sync
- Migration from localStorage to userData
- Advanced error recovery (retry logic, fallback states)

---

## Dependencies

**No new packages required**:
- Alpine.js (already present via CDN)
- xterm.js + @xterm/addon-fit (already present)
- node-pty (already present)
- Electron child_process or IPC (standard library)

**Modified files**:
- `index.html` - Replace layout structure
- `renderer.js` - Add Alpine component, drag handlers, hegel CLI call
- `index.html` `<style>` section - Add split-pane CSS

**New CSS classes needed**:
```css
.split-container {
  display: flex;
  width: 100%;
  height: 100vh;
}

.split-pane {
  overflow: auto;
}

.divider {
  width: 4px;
  background: #444;
  cursor: col-resize;
}

.divider.dragging {
  background: #0e639c;
}
```

---

## Notes

**Why localStorage**: Simpler than Electron userData for single-window state, can migrate later if needed.

**Why 60/40 default**: Markdown browser (left) gets more space for document reading, terminal (right) still usable.

**Defensive coding**: Clamp split position to prevent 0% or 100% widths, handle missing localStorage gracefully, catch hegel command errors.

**Future work**: This establishes layout mechanics. Next feature: populate left panel with actual markdown rendering.
