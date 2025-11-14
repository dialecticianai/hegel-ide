# Settings Tab Specification

Move theme selector and dev tools toggle from Projects tab to a new closeable Settings tab.

## Overview

**What it does:** Introduces a Settings tab that houses application-wide settings (theme selector, dev tools toggle). The Settings tab opens when user clicks a ⚙️ button in the Projects tab header.

**Key principles:**
- Settings is a system tab (built-in, always available via ⚙️ button)
- Settings is closeable (unlike Projects tab)
- Settings always opens at position 1 (immediately right of Projects tab)
- Settings tab content is identical to current Projects tab right-aligned controls

**Scope:** Single feature - relocate existing controls to dedicated tab with predictable positioning.

**Integration context:**
- Integrates with existing tab system in `lib/tabs.js`
- Uses existing theme management in `lib/themes.js`
- Uses existing dev tools toggle in `lib/markdown.js`

## Data Model

### MODIFIED: Tab Object (lib/tabs.js)

Settings tab uses existing tab structure with specific values:

```javascript
{
  id: 'settings',
  type: 'settings',
  label: 'Settings',
  closeable: true
}
```

**Field purposes:**
- `id`: Unique identifier for deduplication
- `type`: Identifies tab category for content rendering
- `label`: Display text in tab header
- `closeable`: Allows user to close the tab

### MODIFIED: leftTabs Array (lib/tabs.js)

Settings tab positioning follows this invariant:
- Index 0: Projects tab (always present, non-closeable)
- Index 1: Settings tab (when open, closeable)
- Index 2+: Project detail tabs, file tabs (closeable)

When Settings tab is opened:
- If Settings doesn't exist in `leftTabs`, insert at index 1
- If Settings exists, switch to it (no insertion)

## Core Operations

### Operation: Open Settings Tab

**Trigger:** User clicks ⚙️ button in Projects tab header

**Behavior:**
1. Check if Settings tab exists in `leftTabs` array
2. If exists: switch active tab to Settings (`activeLeftTab = 'settings'`)
3. If not exists:
   - Create tab object with type `'settings'`
   - Insert at index 1 in `leftTabs` array
   - Switch active tab to Settings

**State changes:**
- `leftTabs` array gains Settings tab at index 1 (if not already present)
- `activeLeftTab` becomes `'settings'`

**UI updates:**
- Settings tab appears at position 1 in tab bar
- Settings content visible in left panel
- Projects tab content hidden

### Operation: Close Settings Tab

**Trigger:** User clicks × button in Settings tab header

**Behavior:**
1. Remove Settings tab from `leftTabs` array
2. Switch active tab to Projects (index 0)

**State changes:**
- `leftTabs` array loses Settings tab
- `activeLeftTab` becomes `'projects'`

**UI updates:**
- Settings tab removed from tab bar
- Projects tab becomes active
- Projects content visible in left panel

## Test Scenarios

### Simple: Open Settings Tab

1. Launch app (Projects tab active by default)
2. Click ⚙️ button in Projects tab header
3. **Expected:** Settings tab appears at index 1, becomes active, content shows theme selector and dev tools button

### Simple: Close Settings Tab

1. Open Settings tab via ⚙️ button
2. Click × button in Settings tab header
3. **Expected:** Settings tab removed, Projects tab becomes active

### Simple: Settings Tab is Closeable

1. Open Settings tab
2. **Expected:** Settings tab shows × button (unlike Projects tab which has no × button)

### Complex: Re-open Settings After Close

1. Open Settings tab (appears at index 1)
2. Close Settings tab
3. Open a project detail tab (appears at index 1)
4. Click ⚙️ button again
5. **Expected:** Settings tab appears at index 1, project detail tab shifts to index 2

### Complex: Deduplicate Settings Tab

1. Open Settings tab
2. Click ⚙️ button again
3. **Expected:** Settings tab remains at index 1 (no duplicate), stays active

### Error: Theme Controls Removed from Projects Tab

1. View Projects tab content
2. **Expected:** No theme selector dropdown, no "Toggle DevTools" button in Projects tab header

## Success Criteria

- All existing tests pass: `npm test`
- Theme selector and dev tools button no longer present in Projects tab header (index.html lines 49-62 removed/replaced)
- ⚙️ button visible in Projects tab header
- Clicking ⚙️ button opens Settings tab at position 1
- Settings tab shows × close button
- Settings tab content contains theme selector dropdown with options: Auto, Dark, Light, Synthwave
- Settings tab content contains "Toggle DevTools" button
- Theme selection in Settings tab updates UI theme (existing `setTheme()` behavior)
- Dev tools button in Settings tab toggles dev tools (existing `toggleDevTools()` behavior)
- Closing Settings tab switches to Projects tab
- Re-opening Settings tab after close positions at index 1
- Opening Settings when already open does not duplicate tab
- New tests in e2e/tabs.spec.js validate Settings tab behavior

## Out of Scope

- Additional settings beyond theme and dev tools
- Settings persistence beyond existing theme persistence
- Keyboard shortcuts for opening Settings
- Settings tab positioning other than index 1
