# UI Tabs Specification

Add tab support to both panels: left panel manages project views, right panel manages multiple terminal sessions.

---

## Overview

**What it does**: Adds tab bars to both split panels, enabling multiple project detail views (left) and multiple terminal sessions (right).

**Key principles**:
- Each panel has independent tab bar above content area
- Main tabs non-closeable: "Projects" (left), "Terminal 1" (right)
- Additional tabs closeable via "×" button
- No session persistence (start fresh: Projects + Terminal 1)
- Simple tab mechanics: click to switch, button to add new

**Scope**:
- Tab bar UI components for both panels
- Tab state management (Alpine.js reactive arrays)
- Multi-terminal support via IPC (multiple ptyProcess instances)
- Project detail tabs via `hegel pm discover show [name] --json`
- Horizontal scrollbar for overflow (no tab limits)
- Active tab tracking and content switching

**Integration context**:
- Extends existing split-pane layout (renderer.js:6-84, index.html:87-118)
- Modifies terminal initialization to support multiple instances (renderer.js:86-132)
- Adds IPC handlers for multi-terminal management (main.js:43-50)
- Preserves existing `get-projects` IPC handler (main.js:53-86)
- Existing split position persistence unchanged (renderer.js:17-28)

---

## Data Model

### Alpine.js State (Modified)

**Component**: `x-data="splitPane"` (renderer.js:7)

**NEW fields**:
```javascript
{
  // Existing fields (unchanged)
  leftPanelPercent: 60,
  isDragging: false,
  projects: [],
  projectsLoading: true,
  projectsError: null,

  // NEW: Left panel tabs
  leftTabs: [
    { id: 'projects', type: 'projects', label: 'Projects', closeable: false }
  ],
  activeLeftTab: 'projects',

  // NEW: Right panel tabs
  rightTabs: [
    { id: 'term-1', type: 'terminal', label: 'Terminal 1', closeable: false, terminalId: 'term-1' }
  ],
  activeRightTab: 'term-1',

  // NEW: Terminal instance tracking
  terminals: {}, // Map: terminalId -> { term: Terminal, fitAddon: FitAddon }

  // NEW: Project detail data cache
  projectDetails: {}, // Map: projectName -> { data: object, loading: boolean, error: string|null }

  // NEW: Counter for generating unique IDs
  nextTerminalNumber: 2
}
```

**Field semantics**:
- `leftTabs` / `rightTabs`: Array of tab descriptor objects
- Tab `id`: Unique string identifier (`'projects'`, `'term-1'`, `'project-hegel-pm'`, etc.)
- Tab `type`: `'projects'` | `'project-detail'` | `'terminal'`
- Tab `label`: Display string (`'Projects'`, `'Terminal 2'`, `'hegel-pm'`, etc.)
- Tab `closeable`: Boolean (main tabs false, others true)
- Tab `terminalId`: (terminal tabs only) Maps to `terminals` object key
- Tab `projectName`: (project-detail tabs only) Project name for `hegel pm discover show`
- `terminals`: Runtime map of Terminal.js instances (not serialized)
- `projectDetails`: Cache map with entries: `{ data: object, loading: boolean, error: string|null }`
  - Used to avoid redundant fetches when reopening tabs
  - Can be refreshed via refresh button in UI

### IPC Messages (Modified/New)

**EXISTING (unchanged)**:
- `get-projects` (invoke) → returns `string[]` of project names
- `terminal-input` (send): `{ data: string }` - Input for single terminal
- `terminal-output` (receive): `string` - Output from single terminal
- `terminal-resize` (send): `{ cols: number, rows: number }` - Resize single terminal

**MODIFIED**:
- `terminal-input` (send): `{ terminalId: string, data: string }` - Input for specific terminal
- `terminal-output` (receive): `{ terminalId: string, data: string }` - Output from specific terminal
- `terminal-resize` (send): `{ terminalId: string, cols: number, rows: number }` - Resize specific terminal

**NEW**:
- `create-terminal` (invoke): `{ terminalId: string }` → returns `{ success: boolean }`
  - Creates new pty process with given ID
  - Returns success/failure (e.g., spawn error)
- `close-terminal` (invoke): `{ terminalId: string }` → returns `{ success: boolean }`
  - Kills pty process for given terminal
  - Returns success (idempotent, okay if already closed)
- `get-project-details` (invoke): `{ projectName: string }` → returns project JSON object
  - Executes `hegel pm discover show [projectName] --json`
  - Returns parsed JSON or throws error

### Hegel CLI Output (Reference)

**Command**: `hegel pm discover show [project_name] --json`

**Output structure** (from main.js verification):
```json
{
  "name": "hegel-pm",
  "project_path": "/Users/emadum/Code/github.com/dialecticianai/hegel-pm",
  "hegel_dir": "/Users/emadum/Code/github.com/dialecticianai/hegel-pm/.hegel",
  "hegel_size_bytes": 2704612,
  "last_activity": "2025-11-07T18:20:58.490889383+00:00",
  "workflow_state": null,
  "metrics": {
    "total_input_tokens": 143578,
    "total_output_tokens": 147696,
    "total_events": 748,
    "phase_count": 233
  },
  "error": null
}
```

**Display strategy**: Render as formatted JSON or simple key-value list (MVP: `<pre>` tag with JSON.stringify)

---

## Core Operations

### Operation: Render Tab Bars

**Behavior**:
- Each panel has tab bar directly above content area
- Tab bar contains: tab buttons (left-aligned) + "+" button (right-aligned)
- Each tab button shows label + "×" close button (if closeable)
- Active tab visually distinct (highlighted background/border)
- Overflow tabs cause horizontal scrollbar on tab bar

**HTML Structure** (new):
```html
<!-- Left Panel with Tabs -->
<div class="split-pane left-pane" :style="{ width: leftPanelPercent + '%' }">
  <!-- Tab Bar -->
  <div class="tab-bar">
    <div class="tabs-list">
      <template x-for="tab in leftTabs" :key="tab.id">
        <div class="tab"
             :class="{ 'active': activeLeftTab === tab.id }"
             @click="switchLeftTab(tab.id)">
          <span x-text="tab.label"></span>
          <button x-show="tab.closeable"
                  class="close-tab"
                  @click.stop="closeLeftTab(tab.id)">×</button>
        </div>
      </template>
    </div>
    <button class="add-tab" @click="addProjectTab">+</button>
  </div>

  <!-- Tab Content Area -->
  <div class="tab-content">
    <!-- Projects tab content -->
    <div x-show="activeLeftTab === 'projects'">
      <h2>Markdown Browser</h2>
      <p>Discovered Projects:</p>
      <ul class="projects-list" x-show="!projectsLoading && !projectsError">
        <template x-for="project in projects" :key="project">
          <li @click="openProjectTab(project)"
              style="cursor: pointer;"
              x-text="project"></li>
        </template>
      </ul>
      <p x-show="projectsLoading">Loading projects...</p>
      <p x-show="projectsError" class="error" x-text="projectsError"></p>
    </div>

    <!-- Project detail tabs content -->
    <template x-for="tab in leftTabs.filter(t => t.type === 'project-detail')" :key="tab.id">
      <div x-show="activeLeftTab === tab.id">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 x-text="tab.label"></h2>
          <button @click="refreshProjectDetails(tab.projectName)"
                  :disabled="projectDetails[tab.projectName]?.loading"
                  class="refresh-button">
            <span x-text="projectDetails[tab.projectName]?.loading ? 'Loading...' : 'Refresh'"></span>
          </button>
        </div>
        <div x-show="projectDetails[tab.projectName]?.loading">Loading project details...</div>
        <div x-show="projectDetails[tab.projectName]?.error" class="error" x-text="projectDetails[tab.projectName]?.error"></div>
        <pre x-show="projectDetails[tab.projectName]?.data" x-text="JSON.stringify(projectDetails[tab.projectName]?.data, null, 2)"></pre>
      </div>
    </template>
  </div>
</div>

<!-- Right Panel with Tabs (similar structure) -->
<div class="split-pane right-pane" :style="{ width: (100 - leftPanelPercent) + '%' }">
  <div class="tab-bar">
    <div class="tabs-list">
      <template x-for="tab in rightTabs" :key="tab.id">
        <div class="tab"
             :class="{ 'active': activeRightTab === tab.id }"
             @click="switchRightTab(tab.id)">
          <span x-text="tab.label"></span>
          <button x-show="tab.closeable"
                  class="close-tab"
                  @click.stop="closeRightTab(tab.id)">×</button>
        </div>
      </template>
    </div>
    <button class="add-tab" @click="addTerminalTab">+</button>
  </div>

  <!-- Terminal Content Area -->
  <div class="tab-content">
    <template x-for="tab in rightTabs" :key="tab.id">
      <div x-show="activeRightTab === tab.id"
           :id="'terminal-container-' + tab.terminalId"
           class="terminal-container"></div>
    </template>
  </div>
</div>
```

**Validation**:
- Both panels render tab bars
- Default tabs visible: "Projects" (left), "Terminal 1" (right)
- "+" buttons visible in both tab bars
- No close button on main tabs

---

### Operation: Switch Active Tab

**Syntax**: User clicks tab button (not close button)

**Behavior**:
1. Click event on `.tab` element (excluding `.close-tab` button via `@click.stop`)
2. Call `switchLeftTab(tabId)` or `switchRightTab(tabId)`
3. Update `activeLeftTab` or `activeRightTab` reactive variable
4. Alpine reactivity shows/hides content via `x-show="activeLeftTab === tab.id"`
5. Active tab gets `.active` CSS class via `:class="{ 'active': activeLeftTab === tab.id }"`

**Terminal-specific**: When switching to terminal tab, call `fitAddon.fit()` to resize terminal to visible container

**Example**:
- User has tabs: "Projects", "hegel-pm" (left panel)
- Currently viewing "Projects"
- Clicks "hegel-pm" tab
- Left content area switches to show project detail JSON

**Validation**:
- Clicking tab updates active state
- Content area displays correct tab content
- Only one tab active per panel at a time
- Terminal resizes correctly when switched to

---

### Operation: Close Tab

**Syntax**: User clicks "×" button on closeable tab

**Behavior**:
1. Click event on `.close-tab` button (uses `@click.stop` to prevent tab switch)
2. Call `closeLeftTab(tabId)` or `closeRightTab(tabId)`
3. Verify tab is closeable (defensive check, UI shouldn't show button otherwise)
4. Remove tab from `leftTabs` or `rightTabs` array
5. If closing active tab, switch to first tab in array (always non-closeable main tab)
6. **For terminal tabs**: Call `ipcRenderer.invoke('close-terminal', { terminalId })` to kill pty
7. **For terminal tabs**: Clean up Terminal.js instance (`terminals[terminalId].term.dispose()`)
8. **For terminal tabs**: Remove from `terminals` map
9. **For project tabs**: Optionally clear cached data from `projectDetails` (not required)

**Example**:
- User has tabs: "Terminal 1", "Terminal 2", "Terminal 3"
- Active tab: "Terminal 2"
- Clicks "×" on "Terminal 2"
- Tab removed, switches to "Terminal 1"
- Pty process for Terminal 2 killed

**Validation**:
- Closeable tabs disappear when closed
- Active tab switches if closed tab was active
- Terminal processes cleaned up (no zombie ptys)
- Cannot close main tabs (UI prevents)

---

### Operation: Open Project Detail Tab

**Syntax**: User clicks project name in "Projects" tab list

**Behavior**:
1. Click event on project list item (`<li>` in projects list)
2. Call `openProjectTab(projectName)`
3. Check if tab already exists: `leftTabs.find(t => t.projectName === projectName)`
4. If exists: Switch to that tab (`switchLeftTab(tab.id)`) - uses cached data
5. If new:
   - Generate unique tab ID: `'project-' + projectName`
   - Create tab object: `{ id, type: 'project-detail', label: projectName, closeable: true, projectName }`
   - Push to `leftTabs` array
   - Switch to new tab: `switchLeftTab(id)`
   - Check cache: `projectDetails[projectName]`
   - If cached: Display cached data immediately
   - If not cached: Fetch project details (see "Fetch/Refresh Project Details" operation)

**Example**:
- User clicks "hegel-pm" in projects list
- New tab "hegel-pm" appears in left tab bar
- Tab content shows JSON from `hegel pm discover show hegel-pm --json`
- Clicking "hegel-pm" again just switches to existing tab (instant, cached data)
- User can click "Refresh" button to get fresh data

**Validation**:
- Clicking project creates new tab
- Tab shows project detail data
- Clicking same project twice doesn't create duplicate tab
- Cached data loads instantly on tab reopen
- Multiple project tabs can exist simultaneously

---

### Operation: Fetch/Refresh Project Details

**Syntax**: Called automatically when opening new project tab, or manually via "Refresh" button

**Behavior**:
1. Called by `openProjectTab(projectName)` if not cached, or by `refreshProjectDetails(projectName)` from refresh button
2. Set loading state: `projectDetails[projectName] = { data: null, loading: true, error: null }`
3. Fetch via IPC: `await ipcRenderer.invoke('get-project-details', { projectName })`
4. On success:
   - Update cache: `projectDetails[projectName] = { data: result, loading: false, error: null }`
   - Display updates reactively via Alpine
5. On error:
   - Update cache: `projectDetails[projectName] = { data: null, loading: false, error: errorMessage }`
   - Display error message in tab content

**Example**:
- User opens "hegel-pm" tab for first time
- Shows "Loading project details..." message
- Fetches from `hegel pm discover show hegel-pm --json`
- Displays JSON data
- User clicks "Refresh" button later
- Shows "Loading..." on button (disabled during fetch)
- Fetches fresh data, updates display

**Validation**:
- Loading state displays while fetching
- Cached data loads instantly on reopen
- Refresh button fetches fresh data
- Refresh button disabled during loading
- Errors display gracefully

---

### Operation: Add New Terminal Tab

**Syntax**: User clicks "+" button in right panel tab bar

**Behavior**:
1. Click event on `.add-tab` button (right panel)
2. Call `addTerminalTab()`
3. Generate unique terminal ID: `'term-' + nextTerminalNumber`
4. Increment `nextTerminalNumber`
5. Create tab object: `{ id, type: 'terminal', label: 'Terminal ' + (nextTerminalNumber - 1), closeable: true, terminalId }`
6. Push to `rightTabs` array
7. Request pty creation: `await ipcRenderer.invoke('create-terminal', { terminalId })`
8. If successful:
   - Create Terminal.js instance
   - Create FitAddon instance
   - Mount to container: `term.open(document.getElementById('terminal-container-' + terminalId))`
   - Fit to container: `fitAddon.fit()`
   - Store in map: `terminals[terminalId] = { term, fitAddon }`
   - Set up IPC listeners for this terminal (input/output/resize)
   - Switch to new tab: `switchRightTab(id)`
9. If failed: Show error, remove tab from array

**Example**:
- User clicks "+" in right panel
- New tab "Terminal 2" appears
- Tab contains fresh bash session
- Terminal 2 operates independently of Terminal 1

**Validation**:
- Each new terminal gets unique ID
- Terminal numbers increment sequentially
- Multiple terminals work independently
- Each terminal has separate pty process

---

### Operation: Initialize Default Tabs on Launch

**Syntax**: Alpine component `init()` lifecycle hook (renderer.js:16)

**Behavior**:
1. Initialize left panel: `leftTabs = [{ id: 'projects', type: 'projects', label: 'Projects', closeable: false }]`
2. Initialize right panel: `rightTabs = [{ id: 'term-1', type: 'terminal', label: 'Terminal 1', closeable: false, terminalId: 'term-1' }]`
3. Set active tabs: `activeLeftTab = 'projects'`, `activeRightTab = 'term-1'`
4. Initialize Terminal 1:
   - Wait for DOM ready
   - Create Terminal.js instance
   - Mount to `#terminal-container-term-1`
   - Set up IPC with terminalId='term-1'
   - Store in `terminals['term-1']`
5. Load projects (existing behavior, unchanged)
6. Load saved split position (existing behavior, unchanged)

**Modified from existing**: Terminal initialization moves from global scope into Alpine component, uses terminalId in IPC messages

**Validation**:
- App launches with "Projects" and "Terminal 1" tabs
- Terminal 1 functional on launch
- No other tabs present initially

---

## Test Scenarios

### Simple: Tab Bars Render

1. Launch app (`npm start`)
2. Verify left panel has tab bar with "Projects" tab + "+" button
3. Verify right panel has tab bar with "Terminal 1" tab + "+" button
4. Verify both tab bars visually distinct from content area
5. Verify no close buttons on main tabs

**Expected**: Tab bars render correctly with default tabs

---

### Complex: Multiple Terminals Work Independently

1. Launch app
2. Type `echo A` in Terminal 1, press Enter
3. Verify output "A" appears in Terminal 1
4. Click "+" in right panel
5. Verify "Terminal 2" tab appears
6. Switch to Terminal 2 (should auto-switch on creation)
7. Type `echo B` in Terminal 2, press Enter
8. Verify output "B" appears
9. Switch back to Terminal 1
10. Verify "A" still visible (history preserved)
11. Type `echo C` in Terminal 1, press Enter
12. Verify output "C" appears in Terminal 1 (not Terminal 2)

**Expected**: Each terminal maintains separate session and command history

---

### Complex: Project Detail Tab Opens, Caches, and Refreshes

1. Launch app
2. Wait for projects list to load
3. Click "hegel-pm" in projects list
4. Verify new tab "hegel-pm" appears in left panel
5. Verify "Loading project details..." message appears briefly
6. Verify tab content shows JSON with fields: `name`, `project_path`, `metrics`, etc.
7. Verify "Refresh" button visible in top-right
8. Close "hegel-pm" tab (click "×")
9. Verify tab disappears, switches back to "Projects" tab
10. Click "hegel-pm" in projects list again
11. Verify tab appears with cached data instantly (no loading message)
12. Click "Refresh" button
13. Verify button shows "Loading..." and is disabled
14. Verify fresh data loads (may be same as cached if no changes)
15. Verify button returns to "Refresh" and enabled

**Expected**: Project detail tabs open, display data, cache for fast reopen, and refresh on demand

---

### Complex: Close Active Terminal Tab

1. Launch app
2. Click "+" to create Terminal 2
3. Click "+" to create Terminal 3
4. Currently on Terminal 3 (active)
5. Click "×" on Terminal 3
6. Verify Terminal 3 disappears
7. Verify active tab switches to Terminal 1 (first tab)
8. Verify Terminal 1 still functional

**Expected**: Closing active tab switches to fallback tab, terminal still works

---

### Error: Project Detail Fetch Fails

1. Launch app
2. Temporarily break hegel (rename binary or modify PATH)
3. Click project name in list
4. Verify new tab opens
5. Verify tab content shows error message (not crash)
6. Verify other tabs still functional

**Expected**: Graceful error handling, app remains usable

---

### Edge: Tab Overflow with Horizontal Scroll

1. Launch app
2. Open 10+ project detail tabs (click many projects)
3. Verify tab bar shows horizontal scrollbar
4. Verify can scroll to see all tabs
5. Verify clicking tabs still works when scrolled
6. Verify "+" button remains accessible (pinned right)

**Expected**: Tab overflow handled with scrollbar, all tabs accessible

---

## Success Criteria

Agent-verifiable:
- App launches with tab bars visible in both panels
- Default tabs present: "Projects" (left), "Terminal 1" (right)
- Cannot close main tabs: No "×" button on "Projects" and "Terminal 1"
- Clicking project name opens new tab in left panel
- Project detail tab displays JSON from `hegel pm discover show [name] --json`
- Refresh button visible in project detail tabs
- Refresh button fetches fresh data when clicked
- Refresh button disabled during loading
- Reopening closed project tab uses cached data (instant load)
- Closing project detail tab removes it from UI
- Clicking "+" in right panel creates new terminal tab
- New terminal tab has independent bash session
- Can switch between terminal tabs, each maintains separate history
- Closing terminal tab (not Terminal 1) removes it and cleans up pty
- Multiple terminals can coexist and operate independently
- Terminal input/output routed correctly by terminalId
- Tab overflow shows horizontal scrollbar
- No session persistence: Reloading app shows only "Projects" + "Terminal 1"

Optional Human Testing:
- Tab switching feels responsive
- Terminal resize smooth when switching tabs
- Tab bar layout looks clean
- Close buttons easy to click (not too small)
- Horizontal scroll usable for many tabs

---

## Out of Scope

**Deferred to future features**:
- Tab reordering (drag tabs to rearrange)
- Keyboard shortcuts (Cmd+T new terminal, Cmd+W close tab, Cmd+1-9 switch tabs)
- Tab context menu (right-click for options)
- Terminal tab renaming (custom labels beyond "Terminal N")
- Project tab icons or status indicators
- Tab persistence across sessions (restore open tabs/terminals)
- Close all tabs button
- Split terminal view (multiple terminals visible simultaneously)
- Tab grouping or categorization
- Markdown rendering in project tabs (MVP: display raw JSON)
- Pretty-printed project detail view (formatted key-value, not just JSON)
- Search/filter in project list

**Explicitly out**:
- Terminal session persistence (command history, scrollback across restarts)
- Pty process migration (move terminal to new tab)
- Tab state synchronization across multiple windows
- Maximum tab limits or warnings
- Tab animations (fade in/out)
- Tab tooltips on hover
- Advanced error recovery (retry failed project fetches)

---

## Dependencies

**No new packages required**:
- Alpine.js (already present)
- xterm.js + @xterm/addon-fit (already present)
- node-pty (already present)
- Electron IPC (already present)

**Modified files**:
- `index.html` - Add tab bar structure to both panels
- `renderer.js` - Extend Alpine component for tab management, multi-terminal support
- `main.js` - Modify IPC handlers for multi-terminal, add project detail handler
- `index.html` `<style>` section - Add tab bar CSS

**New CSS classes needed**:
```css
.tab-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #252526;
  border-bottom: 1px solid #444;
  padding: 4px 8px;
}

.tabs-list {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2d2d2d;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  white-space: nowrap;
}

.tab.active {
  background: #1e1e1e;
  border-bottom: 2px solid #0e639c;
}

.close-tab {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  margin-left: 4px;
}

.close-tab:hover {
  color: #f48771;
}

.add-tab {
  background: #2d2d2d;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 12px;
  border-radius: 4px;
}

.add-tab:hover {
  background: #3e3e3e;
}

.tab-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.terminal-container {
  width: 100%;
  height: 100%;
  background: #000;
  padding: 10px;
  border-radius: 4px;
}

.refresh-button {
  background: #0e639c;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.refresh-button:hover:not(:disabled) {
  background: #1177bb;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Notes

**Why no persistence**: Simpler implementation for MVP, terminals lose state anyway (can't serialize pty), projects list refreshes on load.

**Why unique terminal IDs**: Enables IPC message routing to correct pty process, allows multiple terminals to coexist without collision.

**Why cache project details**: Fast reopening of closed tabs without refetching. Hegel PM is fast Rust code, but caching eliminates even that delay for instant tab switching. Refresh button allows fetching fresh data when needed (best of both worlds).

**Terminal cleanup**: Critical to dispose Terminal.js instances and kill pty processes to avoid memory leaks and zombie processes.

**Future work**: This establishes tab infrastructure. Next features: actual markdown rendering in project tabs, terminal session persistence, keyboard shortcuts.
