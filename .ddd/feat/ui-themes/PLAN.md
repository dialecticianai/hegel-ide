# UI Themes Implementation Plan

Implementation plan for application-wide theme system with auto/dark/light/synthwave modes.

## Overview

**Goal:** Implement complete theme system supporting four modes (auto, dark, light, synthwave) with localStorage persistence, dynamic system preference tracking, and zero hardcoded colors in styles.

**Scope:** Theme module creation, CSS variable refactoring, theme switching logic, dropdown UI integration, and comprehensive testing.

**Priorities:**
1. Theme infrastructure and state management
2. CSS variable refactoring (complete conversion)
3. Theme switching and auto mode logic
4. UI integration
5. Testing and verification

## Methodology

**TDD Approach:**
- Write tests first for theme state management and switching logic
- Use E2E tests to verify UI integration and theme rendering
- Manual verification for visual aesthetics (gradient effects, color accuracy)

**What to test:**
- Theme initialization from localStorage
- Theme switching updates localStorage and DOM
- Auto mode system preference detection and tracking
- Theme persistence across app restarts
- Dropdown UI interaction

**What not to test:**
- Exact color values (visual verification sufficient)
- CSS variable existence (build-time checks acceptable)
- Gradient aesthetics (subjective, manual verification)

---

## Step 1: Create Theme Module

### Goal
Establish theme state management infrastructure following existing pattern from split-pane module.

### Step 1.a: Write Tests
Create Vitest unit tests for theme module covering:
- Theme initialization reads from localStorage with default fallback to "auto"
- Invalid localStorage data defaults to "auto" without errors
- Theme switching updates internal state
- Theme switching persists to localStorage
- System preference detection for auto mode
- System preference listener setup and teardown

### Step 1.b: Implement Theme Module
Create new module at lib/themes.js following IIFE pattern used in other modules. Implement functions for:
- Reading theme from localStorage with key "hegel-ide:theme"
- Defaulting to auto mode when no saved preference exists
- Saving theme selection to localStorage
- Detecting current system preference using matchMedia
- Applying theme class to document body element
- Setting up system preference change listener for auto mode
- Cleaning up listener when switching away from auto mode

Integrate module into lib/app.js by importing and spreading theme functions into Alpine component.

### Step 1.c: Success Criteria
- Theme module initializes without errors
- localStorage operations work correctly
- Theme state management functions accessible in Alpine component
- Unit tests pass for all theme operations
- Invalid or missing localStorage data handled gracefully

**Commit Point:** `feat(ui-themes): add theme module with localStorage persistence`

---

## Step 2: Define CSS Variables and Theme Classes

### Goal
Refactor all hardcoded colors in styles.css to use CSS custom properties, define all four theme palettes.

### Step 2.a: Identify and Catalog Colors
Review styles.css and identify every hardcoded color value. Document variable name mappings for:
- Background colors (primary, secondary, tertiary, hover states)
- Text colors (primary, secondary, muted)
- Accent colors (primary brand, blue interactive, error states)
- UI element colors (borders, dividers, tab states)
- Synthwave-specific colors (vibrant purples, pinks, cyans)
- Gradient definitions for synthwave theme

### Step 2.b: Define Theme Classes
Create theme class definitions in styles.css for each theme mode:

**theme-dark:** Preserve existing dark mode colors from current hardcoded values and media query definitions.

**theme-light:** Extend existing light mode markdown colors to full application scope.

**theme-synthwave:** Define Tokyo Night-inspired dark base with vibrant 80s accents. Include gradient border definitions for tabs, active states, and dividers. Use saturated purples, hot pinks, and neon cyans for accents.

**theme-auto:** No variable definitions; handled by JavaScript applying dark or light class based on system preference.

### Step 2.c: Replace All Hardcoded Colors
Systematically replace every color value in styles.css with corresponding CSS variable reference. Target all rules including:
- Body and layout containers
- Split-pane and divider styles
- Tab bar and tab states
- Button styles (refresh, devtools, add tab, close tab)
- Project list and content areas
- Terminal container styles
- Markdown content styling
- Error and success states

Remove existing media query-based dark/light mode blocks after extracting color values to theme classes.

### Step 2.d: Success Criteria
- Zero hardcoded color values remain in style rules (only in theme class definitions)
- All four theme classes define complete variable sets
- Synthwave theme includes gradient border definitions
- No visual regressions when applying dark theme (matches current appearance)
- Build succeeds without CSS errors

**Commit Point:** `feat(ui-themes): refactor styles to CSS variables and define theme palettes`

---

## Step 3: Implement Theme Switching Logic

### Goal
Wire up theme module to DOM, implement theme application and auto mode system preference tracking.

### Step 3.a: Write Tests
Create unit tests covering:
- Applying theme adds correct class to body element
- Switching themes removes previous theme class
- Auto mode detects system preference and applies dark or light class
- System preference listener triggers theme update in auto mode
- Switching away from auto mode removes preference listener
- Theme switching does not modify localStorage when in auto mode responding to system changes

Create E2E test covering:
- Theme persists across app restart

### Step 3.b: Implement Theme Application
Extend theme module to apply theme classes to document body element. Handle theme switching by:
- Removing any existing theme class from body
- Adding new theme class to body
- For auto mode, detecting system preference and applying appropriate dark or light class
- Saving theme selection to localStorage (except when auto mode responds to system changes)

Implement system preference change listener that:
- Only activates when current theme is auto
- Detects preference changes using matchMedia change event
- Applies dark or light theme class without modifying localStorage
- Cleans up listener when switching to manual theme

### Step 3.c: Initialize Theme on App Load
Add theme initialization to Alpine component init function in lib/app.js. On application load:
- Read saved theme from localStorage
- Apply theme class to body
- Set up system preference listener if in auto mode

### Step 3.d: Success Criteria
- Theme classes correctly applied to body element
- Only one theme class present at a time
- Auto mode tracks system preference changes in real-time
- Switching from auto to manual theme cleans up listener
- Theme persists across app restarts
- Unit tests pass for all theme switching scenarios
- E2E persistence test passes

**Commit Point:** `feat(ui-themes): implement theme switching and auto mode tracking`

---

## Step 4: Add Theme Dropdown UI

### Goal
Integrate theme selection dropdown into Projects tab header next to DevTools button.

### Step 4.a: Write E2E Tests
Create Playwright tests covering:
- Theme dropdown visible in Projects tab
- Dropdown shows all four theme options (auto, dark, light, synthwave)
- Dropdown displays currently selected theme
- Selecting theme from dropdown updates UI immediately
- Selected theme persists after app restart

### Step 4.b: Modify HTML Template
Update index.html Projects tab header section to add theme dropdown. Wrap DevTools button and new dropdown in shared container div for layout. Create select element with four options:
- Auto (system preference)
- Dark
- Light
- Synthwave

Wire dropdown to Alpine component using x-model for selected theme state and change handler to trigger theme switching.

### Step 4.c: Style Dropdown
Add CSS rules for theme dropdown to match existing button styling. Ensure dropdown integrates visually with Projects tab header layout.

### Step 4.d: Success Criteria
- Theme dropdown visible in Projects tab header
- Dropdown positioned left of DevTools button
- All four theme options available
- Selecting theme updates app immediately
- Current theme shown as selected in dropdown
- E2E tests pass for dropdown interaction
- No layout regressions in Projects tab

**Commit Point:** `feat(ui-themes): add theme selection dropdown to Projects tab`

---

## Step 5: Integration Verification and Polish

### Goal
Verify complete implementation, check for hardcoded colors, ensure no regressions, polish synthwave aesthetics.

### Step 5.a: Visual Verification
Manually test all four themes:
- Auto mode in both light and dark system preferences
- Dark theme matches original appearance
- Light theme extends to full application
- Synthwave theme shows vibrant colors and gradient effects

Verify all UI elements themed correctly:
- Split panes and divider
- Tab bars and tab states
- Buttons (refresh, devtools, add, close)
- Project list and detail views
- Terminal container
- Markdown content
- Error states

### Step 5.b: Hardcoded Color Audit
Search styles.css for any remaining hardcoded color values using pattern matching. Verify only theme class definitions contain hex color codes.

### Step 5.c: Run Full Test Suite
Execute all existing tests to ensure no regressions:
- Unit tests for split-pane, tabs, terminals, projects modules
- E2E tests for app launch, tabs, terminals, split-pane, markdown rendering
- New theme tests

### Step 5.d: Synthwave Polish
Review synthwave theme aesthetics and refine:
- Gradient border implementations on tabs and dividers
- Vibrant accent color usage
- Contrast and readability
- Visual flair without overwhelming interface

### Step 5.e: Success Criteria
- All four themes render correctly across entire application
- No hardcoded colors outside theme definitions
- Full test suite passes without failures
- Existing functionality unchanged (no regressions)
- Synthwave gradient effects visible and appealing
- Manual verification confirms visual quality

**Commit Point:** `feat(ui-themes): verify integration and polish synthwave aesthetics`

---

## Implementation Notes

**Module Integration Pattern:** Follow existing HegelIDE namespace pattern used in split-pane.js, tabs.js, etc. Theme module exports functions via window.HegelIDE.createThemes.

**localStorage Key Convention:** Use "hegel-ide:theme" to match existing "hegel-ide:split-position" pattern.

**CSS Organization:** Keep all theme-related variables and classes in styles.css. No separate theme files needed for this scope.

**Error Handling:** Theme initialization must never block app launch. Invalid data should log warning and fall back to auto mode.

**Auto Mode Behavior:** System preference listener only active when theme explicitly set to auto. Switching to manual theme must remove listener to prevent memory leaks.

**Test Coverage:** Focus on state management and UI integration. Visual aesthetics verified manually. Color accuracy not unit tested.

**Gradient Implementation:** Synthwave gradients applied via CSS variable containing linear-gradient definition, used in border-image or background properties.
