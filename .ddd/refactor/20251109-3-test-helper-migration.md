# Test Helper Migration - Refactor Analysis

**Date:** 2025-11-09
**Target:** e2e test files (11 files)
**Goal:** Replace blind `waitForTimeout()` calls with polling-based helper functions

---

## Problem Statement

**DRY Violation:** Tests use blind `waitForTimeout()` calls with magic timeout constants scattered throughout 114 locations across e2e tests.

**SoC Violation:** Test code mixes timing concerns with test logic, making tests:
- Less reliable (timing assumptions instead of actual state checks)
- Harder to debug (timeout failures don't explain what condition wasn't met)
- Slower (wait full timeout even if condition met earlier)
- Less readable (raw timeout values don't convey intent)

---

## Available Helpers

Located in `e2e/test-constants.js`:

1. **`waitForCondition(page, checkFn, timeout, poll, msg)`** - Generic polling helper
2. **`waitForTab(page, tabText, pane, timeout)`** - Wait for specific tab to appear
3. **`waitForProjectsList(page, timeout)`** - Wait for projects list visibility
4. **`waitForProjectContent(page, timeout)`** - Wait for markdown/error content in project tab

---

## Automated Migration Scope

Created Perl script: `scripts/oneoffs/20251109-migrate_test_helpers.pl`

### Dry-Run Results

```
--- DRY RUN SUMMARY ---
Modified 3 of 11 files

Total replacements:
  waitForProjectContent: 16
  waitForProjectsList: 0
  waitForTab (left pane): 0
  waitForTab (right pane): 0
  TOTAL: 16 waitForTimeout calls replaced
```

### Files Affected

1. **`e2e/markdown-tree-navigation.spec.js`** - 6 replacements
2. **`e2e/markdown-tree.spec.js`** - 5 replacements
3. **`e2e/tabs.spec.js`** - 5 replacements

---

## Transformation Details

### Pattern 1: PROJECT_DETAIL → waitForProjectContent

**Before:**
```javascript
await mainWindow.waitForTimeout(PROJECT_DETAIL);

// Get markdown content
const markdownContent = mainWindow.locator('.markdown-content');
```

**After:**
```javascript
await waitForProjectContent(mainWindow);

// Get markdown content
const markdownContent = mainWindow.locator('.markdown-content');
```

**Rationale:**
- `PROJECT_DETAIL` (2000ms) waits for project content to load
- `waitForProjectContent()` polls until `.markdown-content` or `.error` is visible
- Stops immediately when content appears (faster)
- Clear error message if content doesn't load

**Impact:** 16 occurrences across 3 files

---

## Manual Follow-up Opportunities

After running the automated script, remaining patterns to consider:

### Pattern 2: ALPINE_INIT after Projects tab click

**Current:**
```javascript
await projectsTab.click();
await mainWindow.waitForTimeout(ALPINE_INIT);
// Interact with projects list
```

**Could become:**
```javascript
await projectsTab.click();
await waitForProjectsList(mainWindow);
```

**Estimated:** ~5-10 occurrences

### Pattern 3: TAB_CREATE after tab creation

**Current:**
```javascript
await addButton.click();
await mainWindow.waitForTimeout(TAB_CREATE);
const tab = mainWindow.locator('.tab').filter({ hasText: 'Terminal 2' });
```

**Could become:**
```javascript
await addButton.click();
await waitForTab(mainWindow, 'Terminal 2', 'right');
```

**Estimated:** ~10-15 occurrences
**Note:** Requires knowing tab name, more complex regex pattern

---

## Token Efficiency Gains

### Before Refactor
- 114 `waitForTimeout()` calls
- Each call: ~60 characters of duplicated pattern
- No semantic meaning (just magic numbers)
- Total token cost: ~6,840 characters of timing boilerplate

### After Automated Migration
- 16 calls → helper functions (-14%)
- Each replacement saves ~20 characters
- Adds semantic meaning (waiting for specific conditions)
- Estimated savings: ~320 characters

### After Complete Manual Migration (estimated)
- Potential 40-50 additional replacements
- Could eliminate ~50% of blind waits
- Total savings: ~2,000-3,000 characters
- Improved reliability and test speed

---

## Execution Plan

### Phase 1: Automated (This Refactor)
1. Review dry-run output
2. Run script without `--dry-run` flag
3. Verify imports added correctly
4. Run test suite to ensure no regressions
5. Commit changes

###Phase 2: Manual Follow-up (Optional Future Work)
1. Identify remaining `waitForTimeout(ALPINE_INIT)` patterns
2. Replace with `waitForProjectsList()` where appropriate
3. Identify `waitForTimeout(TAB_CREATE)` with known tab names
4. Replace with `waitForTab()` calls
5. Consider extracting additional domain-specific helpers

---

## Risks & Mitigation

**Risk:** Polling might introduce flakiness if helper timeouts too short
**Mitigation:** Helpers use same timeout values as constants, just poll instead of blind wait

**Risk:** Tests might fail if condition check logic is wrong
**Mitigation:** Dry-run first, full test suite verification before commit

**Risk:** Import statements might not update correctly
**Mitigation:** Script handles both new imports and merging with existing test-constants imports

---

## Success Criteria

- [ ] Script executes without errors
- [ ] All 3 files modified as expected
- [ ] Test suite passes: `npm run test:all`
- [ ] No new ESLint warnings
- [ ] Commit message follows conventional format
- [ ] Tests run measurably faster (16 blind waits → conditional waits)

---

## Out of Scope

- Adding test coverage for untested features
- Refactoring test structure or organization
- Optimizing test performance beyond helper migration
- Updating test assertions or test logic
