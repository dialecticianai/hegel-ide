# Settings Tab Implementation Plan

## Overview

**Goal:** Move theme selector and dev tools toggle from Projects tab to a new closeable Settings tab that opens via ⚙️ button.

**Scope:** Single feature with UI reorganization and tab management logic. All changes isolated to existing tab system (index.html, lib/tabs.js) and test files (e2e/tabs.spec.js, e2e/themes.spec.js).

**Priorities:**
1. Settings tab positioning always at index 1
2. Deduplication when Settings already open
3. Existing theme and dev tools functionality preserved
4. All existing tests continue passing

## Methodology

**TDD Approach:** Write tests first for Settings tab behavior (opening, closing, positioning, deduplication), then implement the tab management logic and UI changes.

**What to test:**
- Settings tab opens at position 1 when ⚙️ clicked
- Settings tab is closeable (has × button, removes from tabs on close)
- Re-opening Settings after close positions at index 1
- Clicking ⚙️ when Settings open just switches to it (no duplicate)
- Theme selector exists in Settings tab content
- Dev tools button exists in Settings tab content

**What not to test:**
- Theme switching behavior (already covered by existing themes.spec.js tests)
- Dev tools toggle behavior (already covered by existing functionality)
- Tab rendering internals (Alpine.js reactive behavior)

---

## Step 1: Add Settings Tab Behavior

### Goal
Implement Settings tab that opens at position 1 via ⚙️ button, supports closing, and prevents duplication.

### Step 1.a: Write Tests

Add test cases to e2e/tabs.spec.js covering Settings tab lifecycle:

**Open Settings tab test:** Verify clicking ⚙️ button in Projects tab opens Settings tab at position 1 (between Projects and any other tabs), Settings becomes active tab, Settings content is visible.

**Settings tab closeable test:** Verify Settings tab shows × close button (unlike Projects tab), clicking × removes Settings from tab bar and switches to Projects tab.

**Settings tab positioning test:** Open Settings, close it, open a project detail tab (now at index 1), click ⚙️ again. Verify Settings appears at index 1 and project detail shifts to index 2.

**Settings tab deduplication test:** Open Settings, click ⚙️ again. Verify Settings remains at index 1 with no duplicate tab created, Settings stays active.

**Settings content test:** Open Settings tab, verify theme selector dropdown is visible with four options (Auto, Dark, Light, Synthwave), verify "Toggle DevTools" button is visible.

### Step 1.b: Implement

**Modify index.html Projects tab header:** Replace theme selector dropdown and "Toggle DevTools" button with single ⚙️ button. Button click calls openSettingsTab function.

**Add Settings tab content section in index.html:** Create new tab content div shown when activeLeftTab equals 'settings'. Content contains theme selector dropdown and "Toggle DevTools" button (identical structure to removed Projects tab controls).

**Add openSettingsTab function to lib/tabs.js:** Function checks if Settings tab exists in leftTabs array. If exists, switch activeLeftTab to 'settings'. If not exists, create tab object with type 'settings', label 'Settings', closeable true, and insert at index 1 in leftTabs array, then set activeLeftTab to 'settings'.

**Tab closing behavior:** Existing closeLeftTab function already handles removing closeable tabs. No changes needed since Settings has closeable: true.

### Success Criteria

- Clicking ⚙️ button in Projects tab opens Settings tab
- Settings tab appears at index 1 in tab bar (between Projects and other tabs)
- Settings tab shows × close button
- Closing Settings removes it from tabs and switches to Projects
- Re-opening Settings always positions at index 1
- Opening Settings when already open does not create duplicate
- Settings content shows theme dropdown and dev tools button
- Theme selector dropdown has options: Auto, Dark, Light, Synthwave
- Theme switching works from Settings tab (existing setTheme behavior)
- Dev tools toggle works from Settings tab (existing toggleDevTools behavior)
- Projects tab no longer shows theme selector or dev tools button
- New tests in e2e/tabs.spec.js pass
- All existing tests continue passing

---

## Step 2: Update Theme Tests

### Goal
Update theme tests to reflect new Settings tab location for theme controls.

### Step 2.a: Modify Theme Tests

Update e2e/themes.spec.js test cases to open Settings tab before interacting with theme selector:

**"theme dropdown is visible" test:** Open Settings tab first, then verify theme selector is visible in Settings content.

**"theme dropdown shows all four options" test:** Open Settings tab first, then check theme selector options.

**"selecting theme updates UI immediately" test:** Open Settings tab first, select theme from Settings content, verify body theme class changes.

**"theme persists across page reload" test:** Open Settings tab on each reload before selecting/verifying theme.

**"theme dropdown defaults to auto" test:** Open Settings tab after clearing localStorage, verify default selection.

Each test opens Settings tab by clicking ⚙️ button in Projects tab header before accessing theme controls.

### Step 2.b: Verify Theme Functionality Preserved

No implementation changes needed. Theme functionality remains identical (setTheme and applyTheme in lib/themes.js unchanged). Only test file updates to navigate to Settings before using controls.

### Success Criteria

- All theme tests in e2e/themes.spec.js pass
- Theme switching behavior unchanged from Settings tab
- Theme persistence unchanged
- Auto mode system preference tracking unchanged

---

**Commit Point:** Bundle Steps 1 and 2 into single commit with message:
`feat(settings-tab): move theme and devtools to closeable Settings tab`

---

## Summary

This plan implements Settings tab as a closeable system tab positioned at index 1. Implementation follows TDD discipline for new Settings tab behavior (Step 1), then updates existing theme tests to use new location (Step 2). All changes bundled into single cohesive commit.
