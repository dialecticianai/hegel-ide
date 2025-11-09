# E2E Test Suite Refactoring Analysis

**Date:** 2025-11-09
**Goal:** Identify tests that can be safely combined to reduce Electron app launch overhead
**Approach:** Look for tests checking independent aspects of the same state without needing cleanup

---

## Summary

**Current state:** 63 tests across 11 files
**Potential savings:** ~15-20 test reductions identified

---

## File-by-File Analysis

### app.spec.js (3 tests → 1 test)

**Current tests:**
1. `app starts without errors` - checks windows.length > 0
2. `main window has correct title` - checks window exists and title = 'Hegel IDE'
3. `window content is visible` - checks Projects heading is visible

**Recommendation:** ✅ COMBINE ALL
- All three tests check initial app launch state
- No state changes between them
- Same setup (launch, wait for load)
- **Proposed test name:** "app launches and displays initial UI"

---

### tabs.spec.js (16 tests)

#### Group 1: Initial State Checks (4 tests → 1 test)

**Tests:**
1. `default tabs exist and are clickable` - checks Projects and Terminal 1 tabs
2. `terminal still works after tab changes` - just checks terminal container exists
3. `cannot close Projects tab (non-closeable)` - checks Projects has no close button
4. `tab overflow has correct CSS` - checks overflow-x: auto and add button

**Recommendation:** ✅ COMBINE
- All check initial state without modifications
- Same setup, no interactions
- **Proposed test name:** "initial tab UI renders correctly"

#### Group 2: Project Tab Initial Checks (2 tests → 1 test)

**Tests:**
1. `can open project detail tab` - opens project tab, checks it exists and shows content/error
2. `project tab shows refresh button` - opens project tab, checks refresh button exists

**Recommendation:** ✅ COMBINE
- Both just open a project and check different UI elements
- No state mutation beyond initial open
- **Proposed test name:** "project tab opens with expected UI elements"

#### Group 3: Settings Tab Initial Checks (2 tests → 1 test)

**Tests:**
1. `can open Settings tab via ⚙️ button` - opens Settings, checks active and position
2. `Settings tab contains theme selector and dev tools button` - opens Settings, checks content

**Recommendation:** ✅ COMBINE
- Both open Settings and check different aspects
- **Proposed test name:** "Settings tab opens with expected content and position"

#### Keep Separate:

These tests involve state changes and should remain separate:
- `clicking tab updates active state` - tests tab switching
- `can add new terminal tab` - tests adding Terminal 2
- `can close terminal tab` - tests add + close flow
- `can close project detail tab` - tests open + close flow
- `Settings tab is closeable` - tests open + close flow
- `Settings tab positions at index 1 when reopened` - complex multi-step test
- `clicking ⚙️ when Settings open does not duplicate tab` - tests deduplication logic

---

### terminal.spec.js (10 tests)

#### Group 1: Terminal Presence (3 tests → 1 test)

**Tests:**
1. `terminal container exists` - checks #terminal-container-term-1 visible
2. `xterm DOM elements are rendered` - checks .xterm elements exist
3. `terminal has visible dimensions` - checks container has width/height

**Recommendation:** ✅ COMBINE
- All check initial terminal rendering state
- No interactions or state changes
- **Proposed test name:** "terminal renders with correct DOM structure"

#### Keep Separate:

Terminal I/O tests involve actual command execution and output verification:
- `simple echo command produces output`
- `pwd command shows current directory`
- `sequential commands work`

Terminal Tab Management tests involve add/close flows:
- `default terminal tab is closeable`
- `closing all terminals shows "Open Terminal" button`
- `clicking "Open Terminal" creates new terminal`
- `reopened terminal is functional`

---

### split-pane.spec.js (4 tests)

#### Potential Group: Initial Layout Checks (3 tests → 1 test)

**Tests:**
1. `split-pane structure renders correctly` - checks panels exist, tabs, terminal
2. `divider has resize cursor` - checks divider cursor style
3. `panels have non-zero width` - checks panel dimensions

**Recommendation:** ✅ COMBINE
- All check initial layout state
- **Proposed test name:** "split-pane layout renders with correct structure"

#### Keep Separate:
- `project list populates from hegel` - involves async data loading, longer wait time

---

### themes.spec.js (5 tests)

#### Group 1: Theme Dropdown Initial State (2 tests → 1 test)

**Tests:**
1. `theme dropdown is visible in Settings tab` - opens Settings, checks dropdown visible
2. `theme dropdown shows all four options` - opens Settings, checks all option values

**Recommendation:** ✅ COMBINE
- Both just open Settings and check dropdown state
- **Proposed test name:** "theme dropdown displays with all options"

#### Keep Separate:

These involve interactions or state changes:
- `selecting theme updates UI immediately` - tests theme switching
- `theme persists across page reload` - tests persistence across app restart
- `theme dropdown defaults to auto on first launch` - tests default value

---

### markdown-tree.spec.js (7 tests)

#### Potential Group: Tree Display Checks (4 tests → 2 tests)

**Tests:**
1. `tree section visible above README` - checks tree container exists
2. `tree renders with box-drawing characters` - checks content has └── ├──
3. `tree shows directories with trailing slash` - checks directory formatting
4. `tree shows files with line counts` - checks file line count display

**Recommendation:** ⚠️ PARTIAL COMBINE
- Tests 1-2 could combine (basic tree rendering)
- Tests 3-4 could combine (tree content formatting)
- **Proposed names:**
  - "markdown tree renders with correct structure"
  - "tree content displays with correct formatting"

#### Keep Separate:
- `tree has three-line max height with scroll` - tests CSS/scrolling behavior
- `tree shows loading state initially` - tests loading state
- `empty tree shows appropriate message` - tests empty state (currently skipped)

---

### image-rendering.spec.js (2 tests)

**Tests:**
1. `renders inline HTML images with correct src paths`
2. `renders markdown images with correct src paths`

**Recommendation:** ❌ KEEP SEPARATE
- Test different image syntaxes (HTML vs markdown)
- Each validates different rendering paths
- Good to keep separate for clarity

---

### markdown-tree-navigation.spec.js (6 tests)

**Recommendation:** ❌ KEEP SEPARATE
- All tests involve interactions (clicks, navigation)
- Each tests different user flows
- Recently fixed for timing issues - don't disturb

---

### markdown-links.spec.js (6 tests)

**Recommendation:** ❌ KEEP SEPARATE
- All involve navigation flows and interactions
- Each tests distinct link behavior
- Important to keep granular for debugging

---

### readme-rendering.spec.js (4 tests)

**Recommendation:** ❌ KEEP SEPARATE
- Each tests different states (with README, without, formatting, refresh)
- Involve different project setups
- Good separation of concerns

---

### quit-test.spec.js (1 test)

**Recommendation:** ✅ KEEP AS-IS
- Single test, already optimal

---

## Summary of Recommendations

### High Confidence Combines (15 tests → 6 tests = 9 test reduction):

1. **app.spec.js:** 3 → 1 test
2. **tabs.spec.js Group 1:** 4 → 1 test
3. **tabs.spec.js Group 2:** 2 → 1 test
4. **tabs.spec.js Group 3:** 2 → 1 test
5. **terminal.spec.js:** 3 → 1 test
6. **split-pane.spec.js:** 3 → 1 test
7. **themes.spec.js:** 2 → 1 test

### Medium Confidence (4 tests → 2 tests = 2 test reduction):

1. **markdown-tree.spec.js:** 4 → 2 tests

### Total Potential Reduction:

- **From:** 63 tests
- **To:** ~52 tests
- **Savings:** ~11 test reductions (~17% fewer Electron launches)
- **Time savings:** Estimated 30-60 seconds per full test run

---

## Next Steps

1. Get user approval on recommendations
2. Start with high-confidence combines (app.spec.js, terminal.spec.js, split-pane.spec.js)
3. Move to tabs.spec.js groups
4. Consider markdown-tree.spec.js carefully
5. Run full test suite after each file to verify no regressions

---

## Notes

- All combines preserve test coverage - just group assertions
- No functionality testing is lost
- Maintains clear test descriptions
- Reduces test execution time significantly
