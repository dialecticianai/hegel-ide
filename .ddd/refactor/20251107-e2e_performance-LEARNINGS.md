# E2E Test Performance Optimization - Learnings

**Date**: 2025-11-07
**Duration**: ~2 hours
**Status**: Partial success (reverted worker-scoped fixtures, kept smoke test removal)
**Goal**: Reduce e2e test execution time from 31.2s to ~15s (50-60% reduction)

---

## Summary

**Attempted**: Worker-scoped Playwright fixtures to share Electron app instance across tests
**Achieved**: Removed redundant smoke test (~1.25s savings)
**Reverted**: Worker-scoped fixtures due to unreliable state pollution

**Final Result**: 24 tests (down from 25), execution time unchanged at ~31s for passing tests

---

## What We Tried

### Approach: Worker-Scoped Fixtures

**Implementation**:
1. Created `e2e/fixtures.js` with worker-scoped `electronApp` and `mainWindow` fixtures
2. Refactored all test files (app.spec.js, split-pane.spec.js, terminal.spec.js, tabs.spec.js) to use fixtures
3. Added cleanup logic in `mainWindow` fixture to reset state between tests

**Code structure**:
```javascript
// e2e/fixtures.js
const test = base.extend({
  electronApp: [async ({}, use) => {
    const electronApp = await electron.launch({ args: ['.'] });
    await use(electronApp);
    await electronApp.close();
  }, { scope: 'worker' }],

  mainWindow: [async ({ electronApp }, use) => {
    const mainWindow = /* get window */;
    await use(mainWindow);
    // Cleanup: close extra tabs, reset state
  }, { scope: 'worker' }]
});
```

**Expected benefits**:
- Launch app once per test file instead of once per test
- Reduce 25 launches → ~5 launches (one per file)
- Save 15-20s (50-65% reduction in total time)

**Observed benefits** (when tests passed):
- app.spec.js test 2: **8ms** (vs ~1.2s before - 99% faster!)
- Most tests: **500ms-1s** (vs 2-3s before - 50-67% faster)

---

## What Went Wrong

### State Pollution Between Tests

**Problem**: Tests sharing the same app instance interfered with each other

**Failures observed**:
1. **"can close terminal tab"** - Terminal 1 not active after previous test
2. **"project tab shows refresh button"** - App in bad state, 30s timeout
3. **"split-pane structure"** - Pre-existing failure (unrelated)

**Execution time with failures**: 46-53s (vs 31.2s baseline)
- Worse than baseline due to 30s timeout penalties on failing tests
- Performance gains masked by failures

### Cleanup Logic Insufficient

**Attempted cleanup** (in `mainWindow` fixture after each test):
- Close all non-default tabs (by checking tab text)
- Reactivate Terminal 1 and Projects tabs
- Wait for animations to complete

**Why it failed**:
- Tab state not consistently reset
- Terminal active state unpredictable
- Project tab interactions left app in weird states
- Timing-dependent cleanup (race conditions)

**Example cleanup code** (didn't work reliably):
```javascript
// Close extra tabs
const leftTabs = await mainWindow.locator('.left-pane .tab').all();
for (const tab of leftTabs) {
  const text = await tab.textContent();
  if (text && !text.includes('Projects')) {
    await tab.locator('.close-tab').click();
  }
}
// Reactivate defaults
await terminal1Tab.click();
await projectsTab.click();
```

**Issues**:
- `textContent()` sometimes empty or stale
- Clicks didn't always register
- State changes asynchronous (not fully awaited)
- Some tests modified app in ways cleanup couldn't predict

---

## Why Worker Scope Failed

### Root Cause: Implicit State Assumptions

**Tests assume fresh app state**:
- Exactly 2 tabs: "Projects" (left) and "Terminal 1" (right)
- Both default tabs active (no extras)
- Terminal buffer empty
- No project detail tabs open

**Worker-scoped sharing violates assumptions**:
- Test A creates Terminal 2 → Test B sees 3 terminal tabs
- Test A opens project detail → Test B sees extra left pane tab
- Test A types commands → Test B's terminal has command history

**Example failure chain**:
1. Test "can add new terminal tab" creates Terminal 2
2. Cleanup attempts to close Terminal 2
3. Next test "can close terminal tab" also creates Terminal 2
4. Now there are 2x Terminal 2 tabs (or Terminal 3)
5. Test expects Terminal 1 to be active, but Terminal 2/3 is active
6. Assertion fails: `expect(hasActiveClass).toBe(true)` → false

### Architectural Incompatibility

**Playwright fixture lifecycle**:
- Worker-scoped fixtures run once per file
- Cleanup happens AFTER `use()` completes
- Can't guarantee state between tests within same worker

**Our app's state**:
- Tabs persist until explicitly closed
- Active tab state managed by Alpine.js
- Terminal buffers accumulate
- IPC messages can arrive async

**Mismatch**: Cleanup is "best effort" but tests need "guaranteed clean slate"

---

## What Worked

### Smoke Test Removal ✅

**Change**: Deleted `e2e/smoke.spec.js`

**Rationale**:
- Smoke test verified "app launches and window appears"
- `app.spec.js` already has "app starts without errors" covering same behavior
- Complete duplication of functionality

**Savings**: ~1.25s per test run

**Risk**: None - coverage maintained by app.spec.js

**Files changed**:
- Deleted: `e2e/smoke.spec.js`
- Updated: `e2e/README.md` (test count 25 → 24, code map)

---

## Learnings

### 1. Worker-Scoped Fixtures Need Stateless Apps

**For worker scope to work**:
- App must reset itself completely between test invocations
- OR tests must be designed to work with shared state
- OR cleanup must be 100% reliable (extremely hard)

**Our app**:
- Stateful (tabs, terminal buffers, Alpine state)
- Tests assume fresh state
- Cleanup can't guarantee fresh state

**Conclusion**: Worker scope not viable for our current architecture

### 2. Performance vs Reliability Trade-off

**Options identified**:

**A. Test-scoped fixtures (what we had)**:
- Each test launches fresh app
- 100% reliable
- Slower (31s for 24 tests)
- Clean, predictable

**B. Worker-scoped with perfect cleanup**:
- Share app across tests in file
- Fast if it works (theoretical ~12-15s)
- Unreliable in practice
- Brittle, hard to maintain

**C. Worker-scoped without cleanup**:
- Tests must tolerate shared state
- Would require rewriting all tests
- Fundamental architecture change
- Not backward compatible

**We chose A** (reverted to baseline) because reliability > speed

### 3. Small Wins Add Up

**Smoke test removal**:
- Simple change
- Clear benefit
- No risk
- Permanent improvement

**Lesson**: Don't let perfect be enemy of good. Small optimizations that work are better than big optimizations that don't.

### 4. Test Independence is Valuable

**Tests currently independent**:
- Can run in any order
- Can run subset without setup
- Failures isolated
- Easy to debug

**Worker scope breaks independence**:
- Test order matters (previous test affects next)
- Can't run single test reliably (need prior cleanup)
- Failures cascade (one bad test breaks subsequent)
- Hard to debug (which test caused pollution?)

**Conclusion**: Test independence worth the performance cost

### 5. Documentation of Failures Valuable

This LEARNINGS.md itself is valuable:
- Future attempts can avoid same pitfalls
- Documents what was tried and why it failed
- Provides starting point for different approaches

---

## Recommendations

### For Future Performance Optimization

**If attempting worker scope again**:

1. **Make app expose reset API**:
   ```javascript
   // In main.js
   ipcMain.handle('test:reset-state', async () => {
     // Close all tabs except defaults
     // Clear terminal buffers
     // Reset Alpine state
     // Return confirmation
   });
   ```

2. **Use reset API in fixtures**:
   ```javascript
   await use(mainWindow);
   await mainWindow.evaluate(() => window.electron.ipcRenderer.invoke('test:reset-state'));
   ```

3. **Validate state between tests**:
   ```javascript
   const state = await mainWindow.evaluate(() => window.Alpine.store('tabs'));
   if (state.leftTabs.length !== 1 || state.rightTabs.length !== 1) {
     throw new Error('State not reset properly');
   }
   ```

### Alternative Approaches

**1. Optimize what slows tests down**:
- Profile actual bottlenecks (app launch? IPC? rendering?)
- Maybe reduce `HEGEL_CMD` timeout (2000ms → 1500ms)
- Maybe parallelize more (currently 4 workers)

**2. Split test suites**:
- Fast tests (no project loading): ~15 tests, ~10s
- Slow tests (project loading): ~9 tests, ~20s
- Run fast suite frequently, slow suite less often

**3. Mock expensive operations**:
- Mock `hegel pm discover list` to return instantly
- Mock project detail loading
- Trade realism for speed (risky)

**4. Conditional optimization**:
- Worker scope for CI (where flakiness acceptable)
- Test scope for local dev (where reliability critical)
- Not recommended (divergent environments)

### Don't Bother With

❌ **sed/awk for file editing** - Always causes issues (now documented in CLAUDE.md)
❌ **Global find/replace** - Too risky without dry-run mode
❌ **Clever cleanup heuristics** - Race conditions inevitable
❌ **Shared mutable state** - Debugging nightmare

---

## Artifacts

### Commits Made

1. `5675778` - test: remove redundant smoke test covered by app.spec.js
2. `c5eb36a` - docs: update test count and add sed prohibition
3. `8034dfa` - docs(e2e): remove smoke.spec.js from code map

### Commits Reverted

- `d3a42a7` - test: add shared worker-scoped fixtures for app.spec.js (and subsequent refactors)

### Files Created

- `.ddd/refactor/20251107-e2e_performance.md` - Initial analysis
- `.ddd/refactor/20251107-e2e_performance-LEARNINGS.md` - This document

---

## Metrics

**Baseline** (before changes):
- 25 tests
- 31.2s execution time
- 1 pre-existing failure (split-pane test)

**With worker-scoped fixtures** (reverted):
- 24 tests
- 46-53s execution time (due to failures)
- 3 failures (1 pre-existing + 2 state pollution)
- Observed fast tests: 8ms (99% faster), 500ms-1s (50-67% faster)
- But unreliable

**Final** (current):
- 24 tests
- ~31s execution time (assuming same as baseline minus smoke test)
- 1 pre-existing failure (split-pane test)
- Saved ~1.25s from smoke test removal

---

## Open Questions

1. **Is the split-pane test failure acceptable?**
   - Pre-dated this refactor
   - Should be fixed separately
   - Unrelated to performance work

2. **Should we pursue app-level reset API?**
   - Significant effort
   - Only valuable if worker scope retry attempted
   - Not urgent

3. **Are current test times (31s) acceptable?**
   - Fast enough for TDD?
   - Fast enough for CI?
   - User satisfaction unclear

4. **Would test suite splitting help?**
   - Separate fast/slow tests?
   - Different value proposition than shared fixtures

---

## Conclusion

Worker-scoped fixtures with shared app state are **not viable** for our current test architecture without significant app-level changes.

**What we kept**:
- ✅ Smoke test removal (1.25s savings)
- ✅ Updated documentation
- ✅ sed/awk prohibition in CLAUDE.md
- ✅ This learnings document

**What we learned**:
- Test independence > performance optimization
- Cleanup logic can't guarantee state reset
- Small wins (smoke test) better than failed big swings
- Document failures for future reference

**Next time**: Consider app-level reset API before attempting worker scope again.
