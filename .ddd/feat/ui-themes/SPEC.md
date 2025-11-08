# UI Themes Specification

Application-wide theme system supporting auto/dark/light/synthwave modes with localStorage persistence.

## Overview

**What it does:** Provides users with selectable visual themes that apply across the entire application interface. Supports automatic system preference detection, manual dark/light selection, and a custom synthwave theme with vibrant 80s-inspired aesthetics.

**Key principles:**
- CSS custom properties for all color values (zero hardcoded colors acceptable)
- Theme state persisted to localStorage
- Auto mode respects and responds to system preference changes
- Synthwave theme includes visual flair (gradient borders, vibrant accents)
- Theme dropdown integrated into existing Projects tab UI

**Scope:** Complete refactoring of all color styling to use CSS variables. New theme selection UI. Theme initialization and persistence logic. All existing functionality preserved with new theming layer.

**Integration context:**
- Modifies: `styles.css` (refactor all colors to variables)
- Modifies: `index.html` (add theme dropdown to Projects tab)
- Modifies: `lib/split-pane.js` or new `lib/themes.js` (theme state management)
- Modifies: `lib/app.js` (integrate theme module)
- Uses: localStorage pattern from split-pane.js for persistence
- Must preserve: existing dark/light markdown rendering behavior

## Data Model

### Theme Configuration (localStorage)

**Key:** `hegel-ide:theme`

**Structure:**
```json
{
  "selected": "auto" | "dark" | "light" | "synthwave"
}
```

**Fields:**
- `selected` (required): Currently active theme choice
- Default value on first launch: `"auto"`

**NEW:** This localStorage entry does not exist yet.

### CSS Custom Properties

**Location:** `styles.css` (MODIFIED)

**Variable naming convention:** `--{category}-{variant}`

**Required variables (minimum ~15-20):**

**Backgrounds:**
- `--bg-primary` - Main app background
- `--bg-secondary` - Secondary surfaces (tabs, panels)
- `--bg-tertiary` - Elevated surfaces (code blocks, highlights)
- `--bg-hover` - Hover states

**Text:**
- `--text-primary` - Main text color
- `--text-secondary` - Secondary text (muted)
- `--text-muted` - Disabled/placeholder text

**Accents:**
- `--accent-primary` - Primary brand color (headings, highlights)
- `--accent-blue` - Interactive elements (links, buttons, active states)
- `--accent-pink` - Synthwave-specific highlight (optional for other themes)
- `--accent-cyan` - Synthwave-specific highlight (optional for other themes)

**UI Elements:**
- `--border-color` - Standard borders
- `--border-active` - Active/focused borders
- `--divider-color` - Split pane divider
- `--error-color` - Error states
- `--success-color` - Success states (future use)

**Special (Synthwave):**
- `--gradient-border` - Gradient definition for synthwave borders
- Additional vibrant accent colors as needed

**Theme class application:**
- Applied to `<body>` element
- Classes: `theme-auto`, `theme-dark`, `theme-light`, `theme-synthwave`
- For `theme-auto`: dynamically applies `theme-dark` or `theme-light` based on system preference

### Theme Definitions

**Dark theme:** Based on current hardcoded dark colors (#1e1e1e, #2d2d2d, #4ec9b0, etc.)

**Light theme:** Based on current markdown light mode colors, extended to full app

**Synthwave theme:**
- Dark-based foundation (similar to Tokyo Night: #1a1b26, #24283b)
- Vibrant 80s-inspired accents (purples, hot pinks, neon cyans)
- Gradient borders on key UI elements (tabs, active states, dividers)
- Example palette inspiration: Tokyo Night + more saturation + gradient effects

**Auto theme:** No variables defined; applies dark or light class based on `window.matchMedia('(prefers-color-scheme: dark)')`

## Core Operations

### Theme Selection

**UI Location:** Projects tab header, left of "Toggle DevTools" button

**Component:** Dropdown/select element with four options:
- Auto (system preference)
- Dark
- Light
- Synthwave

**Behavior:**
1. User selects theme from dropdown
2. Selection saved to localStorage immediately
3. Corresponding theme class applied to `<body>` element
4. All UI updates via CSS variable cascade
5. If "Auto" selected, listen for system preference changes

### Theme Initialization

**Trigger:** Application load (in Alpine component init)

**Behavior:**
1. Read `hegel-ide:theme` from localStorage
2. If missing, default to `"auto"`
3. Apply corresponding theme class to `<body>`
4. If auto mode, set up system preference listener

**System Preference Listener (Auto Mode):**
```javascript
// Conceptual behavior, not implementation
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (currentTheme === 'auto') {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});
```

**Behavior:**
- Only active when theme is set to "auto"
- Immediately responds to system preference changes
- Does not modify localStorage (auto remains auto)

### CSS Variable Application

**Current state:** All colors hardcoded in styles.css

**Required changes:**
- Every color value (`#1e1e1e`, `#2d2d2d`, `#4ec9b0`, etc.) replaced with `var(--variable-name)`
- Variables defined in theme-specific body classes
- No hardcoded colors remain (100% conversion required)

**Example transformation:**
```css
/* Before */
body {
  background: #1e1e1e;
  color: #d4d4d4;
}

/* After */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}

body.theme-dark {
  --bg-primary: #1e1e1e;
  --text-primary: #d4d4d4;
  /* ... all variables */
}
```

## Test Scenarios

### Simple: Manual Theme Switch

**Setup:** App launched with default auto theme

**Steps:**
1. Open app
2. Click theme dropdown in Projects tab
3. Select "Synthwave"
4. Observe UI changes to synthwave colors
5. Restart app
6. Verify synthwave theme persists

**Expected:**
- Dropdown shows "Synthwave" selected
- All UI elements use synthwave color palette
- Gradient borders visible on tabs/dividers
- Theme persists across restarts

### Complex: Auto Mode System Preference Tracking

**Setup:** App launched, theme set to Auto, system in dark mode

**Steps:**
1. Verify app displays dark theme
2. Change system preference to light mode (OS-level)
3. Observe app updates to light theme without reload
4. Change system back to dark mode
5. Observe app updates to dark theme
6. Restart app with auto theme still selected
7. Verify app matches current system preference

**Expected:**
- App dynamically tracks system preference changes
- No localStorage update during auto mode switches
- After restart, auto mode still active and correct

### Complex: All Themes Render Correctly

**Steps:**
1. Switch to dark theme, verify all UI elements use dark palette
2. Switch to light theme, verify all UI elements use light palette
3. Switch to synthwave, verify vibrant colors and gradient effects
4. Switch to auto with dark system pref, verify dark rendering
5. Switch to auto with light system pref, verify light rendering

**Expected:**
- No hardcoded colors visible in any theme
- Markdown content follows theme (existing behavior preserved)
- Tab states, buttons, dividers, text all themed correctly
- Synthwave shows visual flair (gradients)

### Error: Invalid localStorage Data

**Setup:** Corrupt/invalid theme data in localStorage

**Steps:**
1. Set `localStorage['hegel-ide:theme']` to invalid JSON
2. Launch app
3. Verify app defaults to auto theme
4. Select a theme from dropdown
5. Verify localStorage updated with valid data

**Expected:**
- Graceful fallback to auto theme
- No console errors blocking app launch
- User can select theme and continue normally

### Error: Missing Theme Class

**Setup:** Theme variable references a non-existent theme

**Steps:**
1. Manually set localStorage to `{"selected": "nonexistent"}`
2. Launch app
3. Verify app falls back to auto/dark theme

**Expected:**
- Fallback behavior prevents broken UI
- App remains usable

## Success Criteria

**Build and tests:**
- `npm start` launches app without errors
- `npm test` passes all existing tests
- No new test failures introduced

**Color refactoring:**
- Zero hardcoded color values in styles.css (excluding theme definitions)
- All colors use `var(--variable-name)` syntax
- Grep for `#[0-9a-fA-F]{3,6}` in style rules returns only theme class definitions

**Theme persistence:**
- Selected theme saved to localStorage on change
- Selected theme restored on app launch
- Default theme is "auto" on first launch

**Theme switching:**
- Dropdown shows current theme selection
- Selecting theme immediately updates UI
- All four themes (auto, dark, light, synthwave) render correctly

**Auto mode behavior:**
- Auto mode applies dark or light based on system preference
- Auto mode responds to system preference changes without reload
- Switching away from auto mode stops system preference tracking

**Synthwave aesthetics:**
- Gradient borders visible on tabs, active states, or dividers
- Vibrant accent colors distinct from dark/light themes
- Dark-based foundation with 80s-inspired palette

**No regressions:**
- Existing markdown rendering behavior unchanged
- Split-pane drag functionality works
- Tab switching works
- Terminal rendering unaffected
- Projects list and detail views render correctly in all themes

## Out of Scope

- User-defined custom themes (internal themes only)
- Theme editor/customization UI
- Per-panel theme overrides
- Syntax highlighting themes for code blocks (future enhancement)
- Accessibility contrast validation (should follow best practices but not blocking)
- Animation/transitions during theme switching (nice-to-have, not required)
