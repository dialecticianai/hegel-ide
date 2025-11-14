# E2E Test Performance Optimization

**Date**: 2025-11-07
**Scope**: e2e test suite (5 files, 25 tests)
**Current Performance**: 31.2s (24 passed, 1 failed)
**Goal**: Reduce total execution time without compromising test quality

---

## Current Bottlenecks

### 1. **Each test launches new Electron app** (PRIMARY BOTTLENECK)

**Impact**: ~1.25s average per test, most of which is app launch overhead

**Evidence**:
- Every test file has repeated pattern:
  ```javascript
  const electronApp = await electron.launch({ args: ['.'] });
  // ... test logic ...
  await electronApp.close();
  ```
- 25 tests × ~1s launch overhead = ~25s of the 31.2s total

**Files affected**: ALL test files
- `smoke.spec.js`: 1 test
- `app.spec.js`: 3 tests
- `tabs.spec.js`: 11 tests
- `terminal.spec.js`: 6 tests
- `split-pane.spec.js`: 4 tests

**Optimization potential**: HIGH (~50-70% time reduction possible)

---

### 2. **Redundant test coverage**

**Impact**: Wasted execution time on duplicate tests

**Evidence**:
- `smoke.spec.js` (line 3): "app launches and window appears"
- `app.spec.js` (line 4): "app starts without errors"
- Both tests verify same behavior: app launches successfully

**Optimization**: Remove `smoke.spec.js` entirely (saves ~1.25s)

---

### 3. **Repeated boilerplate code**

**Impact**: Token overhead, maintenance burden (minor performance impact)

**Evidence**: Every test repeats these 10 lines:
```javascript
const electronApp = await electron.launch({ args: ['.'] });
const firstPage = await electronApp.firstWindow();
await firstPage.waitForLoadState('domcontentloaded');
const windows = electronApp.windows();
const mainWindow = windows.find(w => w.url().includes('index.html'));
```

**Files affected**: ALL test files
**Lines**:
- `smoke.spec.js`: 5-16
- `app.spec.js`: 5-14, 21-30, 41-50 (3 times)
- `tabs.spec.js`: 6-17 (repeated 11 times)
- `terminal.spec.js`: 6-14, 27-35, 48-56, 73-81, 106-114, 136-144 (6 times)
- `split-pane.spec.js`: 6-14, 43-51, 64-72, 93-101 (4 times)

**Optimization potential**: MEDIUM (token efficiency, maintainability)

---

### 4. **Arbitrary timeout waits**

**Impact**: Adds unnecessary wait time, tests slower than needed

**Evidence**:
- Many hardcoded `waitForTimeout(500)` without justification
- Some tests use constants, others use raw numbers
- Examples:
  - `tabs.spec.js` line 47: `waitForTimeout(500)` (not using constant)
  - `tabs.spec.js` line 98: `waitForTimeout(500)` (not using constant)
  - `tabs.spec.js` line 237: `waitForTimeout(2000)` (not using constant)
  - `terminal.spec.js` line 116: `waitForTimeout(600)` (not using TERMINAL_READY)
  - `terminal.spec.js` line 124: `waitForTimeout(500)` (not using constant)

**Optimization potential**: LOW-MEDIUM (5-10% time reduction by tightening waits)

---

## Proposed Optimizations

### Priority 1: Shared Electron App Fixtures (HIGH IMPACT)

**Approach**: Use Playwright fixtures to share single Electron app per test file

**Implementation**:
1. Create `e2e/fixtures.js` with shared `electronApp` and `mainWindow` fixtures
2. Use `beforeAll` to launch app once per describe block
3. Use `afterAll` to close app after all tests in block complete
4. Optionally reset app state between tests if needed

**Benefits**:
- Launch app once per file instead of once per test
- Reduces 25 launches → ~5 launches (one per file)
- **Estimated time savings**: ~15-20s (50-65% reduction)

**Trade-offs**:
- Tests become slightly coupled (shared state risk)
- Need to ensure tests don't interfere with each other
- One test failure could affect others in same block

**Mitigation**:
- Use `beforeEach` to reset critical state if needed
- Keep test isolation where critical (e.g., tab creation tests might need fresh app)

---

### Priority 2: Remove Redundant Tests (QUICK WIN)

**Approach**: Delete `smoke.spec.js` entirely

**Rationale**:
- `app.spec.js` already covers app launch verification
- Smoke test adds no unique value
- Saves ~1.25s

**Benefits**: Immediate 4% time reduction, less code to maintain

---

### Priority 3: Extract Boilerplate to Helpers (MEDIUM IMPACT)

**Approach**: Create `e2e/helpers.js` with reusable functions

**Functions**:
```javascript
// Get main window (not DevTools)
async function getMainWindow(electronApp) {
  const windows = electronApp.windows();
  return windows.find(w => w.url().includes('index.html'));
}

// Launch app and get main window
async function launchApp() {
  const electronApp = await electron.launch({ args: ['.'] });
  const firstPage = await electronApp.firstWindow();
  await firstPage.waitForLoadState('domcontentloaded');
  const mainWindow = await getMainWindow(electronApp);
  return { electronApp, mainWindow };
}
```

**Benefits**:
- Reduces token overhead
- Easier to maintain (change once, affects all tests)
- Improves readability

**Note**: This becomes less valuable if we implement Priority 1 (fixtures)

---

### Priority 4: Optimize Timeout Constants (LOW-MEDIUM IMPACT)

**Approach**: Audit and reduce timeout values where safe

**Candidates**:
- `HEGEL_CMD: 2000` → Might be reducible to 1500ms
- `PROJECT_DETAIL: 2000` → Might be reducible to 1500ms
- `PROJECT_LOAD: 1500` → Might be reducible to 1000ms
- Hardcoded waits (500ms) → Use constants or reduce

**Process**:
1. Run tests multiple times to find minimum reliable timeout
2. Add 20% buffer for CI environment
3. Update constants

**Benefits**: 3-5s time savings (10-15% reduction)

**Risks**: Flaky tests if timeouts too aggressive

---

## Recommendation

**Implement Priority 1 + Priority 2 first** (highest ROI):

1. **Delete `smoke.spec.js`** (5 min effort, 1.25s savings)
2. **Create shared fixtures** (30-60 min effort, 15-20s savings)

**Expected result**: ~30s → ~10-12s (60-65% reduction)

**Defer Priority 3 + 4** until after validating fixture approach:
- Priority 3 becomes less valuable with fixtures
- Priority 4 requires careful testing to avoid flakiness

---

## Implementation Plan

### Phase 1: Quick Win (Delete smoke test)
1. Delete `e2e/smoke.spec.js`
2. Verify `app.spec.js` covers same scenario
3. Run full suite to confirm no regressions

### Phase 2: Shared Fixtures
1. Create `e2e/fixtures.js`
2. Refactor `app.spec.js` to use shared fixture (pilot)
3. Measure performance improvement
4. If successful, roll out to other files:
   - `split-pane.spec.js`
   - `terminal.spec.js`
   - `tabs.spec.js`
5. Run full suite, verify no flakiness

### Phase 3: Validate & Iterate
1. Run tests 10 times to check for flakiness
2. Adjust fixture strategy if needed (per-file vs per-describe)
3. Document fixture patterns in `e2e/README.md`

---

## Success Criteria

- [ ] Total execution time reduced from ~31s to ≤15s
- [ ] All 24 passing tests continue to pass
- [ ] No increase in test flakiness (run 10x successfully)
- [ ] Tests remain readable and maintainable

---

## Open Questions

1. Should we share app instance per-file or per-describe-block?
   - Per-file: Faster but more coupling
   - Per-describe: Safer isolation but less speedup

2. Which tests MUST have isolated app instances?
   - Tab creation/deletion tests?
   - Terminal tests that type commands?

3. Do we need state reset between tests?
   - If so, what state? (tabs, terminal buffer, etc.)

4. Should we run tests serially within a file to avoid state issues?
   - Might lose parallelization benefits

---

## Risk Assessment

**Low Risk**:
- Deleting smoke test (covered by app.spec.js)

**Medium Risk**:
- Shared fixtures (state coupling, flakiness potential)
- Requires careful testing and possible iteration

**High Risk**:
- Reducing timeouts too aggressively (flaky tests)

**Mitigation**: Implement incrementally, validate at each stage
