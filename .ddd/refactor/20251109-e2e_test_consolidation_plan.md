# E2E Test Consolidation - Implementation Plan

**Date:** 2025-11-09
**Analysis:** See `20251109-e2e_test_consolidation_analysis.md`
**Goal:** Reduce test count from 63 → ~52 by combining independent assertions

---

## Implementation Phases

### Phase 1: Simple Combines (Validation)

**Goal:** Validate approach with simplest cases

#### Step 1.1: app.spec.js (3 → 1 test)

**Current tests:**
- `app starts without errors`
- `main window has correct title`
- `window content is visible`

**Combined test:** `app launches and displays initial UI`

**Approach:**
- Keep single electronApp launch
- Add all assertions from three tests
- Verify windows exist, title correct, Projects heading visible

**Testing:**
- `npx playwright test e2e/app.spec.js`
- `npm test`

#### Step 1.2: terminal.spec.js (3 → 1 test in Terminal Presence group)

**Current tests:**
- `terminal container exists`
- `xterm DOM elements are rendered`
- `terminal has visible dimensions`

**Combined test:** `terminal renders with correct DOM structure`

**Approach:**
- Single app launch
- Check container visible
- Check .xterm elements exist
- Check container has dimensions

**Testing:**
- `npx playwright test e2e/terminal.spec.js`
- `npm test`

#### Step 1.3: split-pane.spec.js (3 → 1 test)

**Current tests:**
- `split-pane structure renders correctly`
- `divider has resize cursor`
- `panels have non-zero width`

**Combined test:** `split-pane layout renders with correct structure`

**Approach:**
- Single app launch
- Verify structure (panels, tabs, terminal)
- Check divider cursor
- Check panel dimensions

**Testing:**
- `npx playwright test e2e/split-pane.spec.js`
- `npm test`

---

### Phase 2: tabs.spec.js Groups

**Goal:** Consolidate tabs.spec.js initial state checks

#### Step 2.1: Initial State Group (4 → 1 test)

**Current tests:**
- `default tabs exist and are clickable`
- `terminal still works after tab changes`
- `cannot close Projects tab (non-closeable)`
- `tab overflow has correct CSS`

**Combined test:** `initial tab UI renders correctly`

**Approach:**
- Single app launch, wait for Alpine
- Check Projects tab (visible, no close button)
- Check Terminal 1 tab (visible, has close button)
- Check terminal container visible
- Check tab overflow CSS
- Check add button visible

**Testing:**
- `npx playwright test e2e/tabs.spec.js --grep "initial tab UI renders correctly"`
- `npm test`

#### Step 2.2: Project Tab Group (2 → 1 test)

**Current tests:**
- `can open project detail tab`
- `project tab shows refresh button`

**Combined test:** `project tab opens with expected UI elements`

**Approach:**
- Open first project
- Check tab exists with close button
- Check refresh button exists
- Check content or error displays

**Testing:**
- `npx playwright test e2e/tabs.spec.js --grep "project tab opens with expected UI elements"`
- `npm test`

#### Step 2.3: Settings Tab Group (2 → 1 test)

**Current tests:**
- `can open Settings tab via ⚙️ button`
- `Settings tab contains theme selector and dev tools button`

**Combined test:** `Settings tab opens with expected content and position`

**Approach:**
- Click Settings icon
- Check tab visible and active
- Check position at index 1
- Check theme selector visible with all options
- Check dev tools button visible

**Testing:**
- `npx playwright test e2e/tabs.spec.js --grep "Settings tab opens with expected content and position"`
- `npm test`

---

### Phase 3: themes.spec.js

**Goal:** Consolidate theme dropdown initial state

#### Step 3.1: Theme Dropdown (2 → 1 test)

**Current tests:**
- `theme dropdown is visible in Settings tab`
- `theme dropdown shows all four options`

**Combined test:** `theme dropdown displays with all options`

**Approach:**
- Open Settings tab
- Check dropdown visible
- Check all options present (Auto, Dark, Light, Synthwave)

**Testing:**
- `npx playwright test e2e/themes.spec.js --grep "theme dropdown displays with all options"`
- `npm test`

---

## Execution Protocol

**For each step:**

1. **Implement** the combined test
2. **Run specific test** to verify it works
3. **Run full suite** to check for regressions
4. **Commit** with descriptive message
5. **Get user approval** before next step

**Commit message format:**
```
refactor(e2e): combine [file] tests - [description]

Combines [N] tests into 1: [test names]
- Preserves all assertions
- Reduces Electron launch overhead
- [X] tests → [Y] test
```

---

## Expected Results

**Final state:**
- From: 63 tests
- To: ~52 tests
- Reduction: ~11 tests (17%)
- Time savings: 30-60 seconds per run

**Coverage maintained:**
- All assertions preserved
- No functionality changes
- Same test coverage, better efficiency

---

## Rollback Plan

If any step causes issues:
1. Use `git revert <commit>` for that step
2. Analyze failure
3. Adjust approach
4. Retry

---

## Success Criteria

- ✅ All tests pass after each step
- ✅ Each step committed atomically
- ✅ No functionality changes
- ✅ Test execution time reduced
- ✅ User approves final structure
