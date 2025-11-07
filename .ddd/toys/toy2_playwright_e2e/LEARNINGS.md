# Toy 2: Playwright E2E Testing – Learnings

Duration: ~2 hours | Status: Complete | Estimate: 2-3 hours

---

## Summary

**Built**: Playwright test infrastructure with 14 E2E tests covering app launch, Alpine.js reactivity, and terminal I/O

**Worked**:
- Playwright for Electron straightforward to set up
- Terminal I/O testing via keyboard simulation + DOM inspection feasible
- Found real bug (race condition) during test development

**Failed**:
- Nothing major - no unexpected blockers

**Uncertain**:
- Whether E2E testing investment is worth it for hegel-ide's development velocity

---

## Evidence

### ✅ Validated

- **Playwright + Electron integration clean**: Single npm install, simple config pointing to electron binary, tests run immediately
- **~90% of toy1 functionality testable**: App launch, window management, Alpine reactivity, terminal presence, and terminal I/O all covered
- **Tests reliable, not flaky**: 14 tests pass consistently in ~11 seconds, no timing issues with proper waits
- **Terminal I/O testable**: Keyboard simulation (`keyboard.type()`, `keyboard.press()`) + DOM content inspection (`.xterm-screen textContent()`) works for command execution verification
- **Test-driven bug finding**: Writing tests exposed race condition in main.js (IPC send to destroyed window) - real value

### ⚠️ Challenged

- **Native module rebuild still required**: node-pty compiled for Node v23 (MODULE_VERSION 131), Electron 39 needs MODULE_VERSION 140 → `npx electron-rebuild` still mandatory
  - Same issue as toy1, will recur for any native dependencies
  - Not a blocker but adds friction to setup

- **DevTools window interferes with firstWindow()**: main.js opens DevTools automatically, Playwright's `firstWindow()` returns DevTools not main window
  - Workaround: Filter windows by URL (`windows.find(w => w.url().includes('index.html'))`)
  - Pattern established, reusable for all tests

- **Test execution speed acceptable but not instant**: 14 tests in ~11 seconds (~785ms per test average)
  - Each test spawns full Electron instance (overhead)
  - Fast enough for TDD but not as fast as unit tests
  - Parallelization helps (4 workers by default)

### 🌀 Uncertain

- **E2E testing ROI for hegel-ide unclear**:
  - Coverage is good, tests caught one real bug
  - But setup overhead and slower execution vs unit tests
  - For GUI-heavy app with IPC/terminal, E2E may be only option
  - Decision deferred: evaluate after more feature work

- **Advanced terminal testing feasibility unknown**: Didn't attempt Ctrl+C interruption or arrow key history (known hard problems from SPEC)
  - Would require deeper xterm state inspection
  - Potentially brittle/timing-dependent
  - Manual verification may be acceptable for these edge cases

---

## Pivots

**None**: Implementation followed PLAN with no architectural changes.

Window finding pattern evolved from naive `firstWindow()` to URL-based filtering, but not a pivot - just refinement.

---

## Impact

### Reusable Assets

- **Playwright config**: `playwright.config.js` with Electron path established
- **Window finding pattern**: `windows.find(w => w.url().includes('index.html'))` for main window isolation
- **Terminal test utilities**: Keyboard simulation + DOM inspection pattern works, reusable for future terminal features
- **Test structure**: Separate test files by concern (app, alpine, terminal) scales well

### Architectural Consequences

- **Native module rebuild required**: Add to setup docs, run after any npm install with native deps
  - electron-rebuild must be in devDependencies
  - CI/CD will need this step

- **DevTools auto-open problematic for tests**: Consider removing `openDevTools()` call in main.js or making it conditional (env var?)
  - Current workaround (URL filtering) works but adds complexity to every test

- **IPC race condition pattern**: Check `mainWindow && !mainWindow.isDestroyed()` before sending IPC messages
  - Apply this pattern to any IPC sends from main process
  - Prevents crashes when tests/users close windows quickly

### Test Coverage Assessment

**Testable** (~90% of functionality):
- Application launch and window management
- Alpine.js reactivity and DOM updates
- Terminal rendering and presence
- Terminal I/O (typing commands, reading output)
- Sequential command execution

**Manual verification required** (~10%):
- Advanced terminal features (Ctrl+C, command history)
- Visual appearance (colors, layout)
- Performance characteristics
- Resize behavior (possible to test but complex)

### Recommendations

**For hegel-ide development**:
- **Keep E2E tests for now**: Good coverage of integration points (IPC, terminal, UI)
- **Add tests for new features incrementally**: Don't retrofit exhaustively, test as you build
- **Run tests in CI**: Fast enough (~11s) to run on every commit
- **Skip advanced terminal edge cases**: Manual verification acceptable for Ctrl+C, arrow keys

**For test infrastructure**:
- **Remove DevTools auto-open**: Env var like `HEGEL_IDE_DEBUG=1` to enable when needed
- **Consider test fixtures**: Reusable Electron app launch helper to reduce boilerplate
- **Monitor test execution time**: If it grows beyond ~30s for full suite, revisit parallelization

### Estimate Calibration

- **Estimated**: 2-3 hours
- **Actual**: ~2 hours
- **Assessment**: Accurate - Playwright setup easier than expected, terminal testing more straightforward than feared
- **Surprise**: Found real bug during test development (IPC race condition) - tests paid for themselves immediately

---

## Open Questions

- Should we remove DevTools auto-open to simplify tests?
- Is 11 seconds acceptable test time, or should we optimize (shared Electron instance)?
- Will E2E test maintenance burden become problematic as features grow?
- Can we test hegel CLI integration via Playwright (spawn hegel, verify output)?

---

## Recommendation

**Invest in E2E testing for hegel-ide.**

**Rationale**:
- GUI + IPC + terminal = hard to unit test, E2E is appropriate tool
- Tests already found one real bug (race condition)
- Execution time acceptable for TDD workflow
- Coverage validates our integration code (which is most of the app)

**Next steps**:
- Add E2E tests for new features as we build them
- Clean up DevTools interference (env var)
- Run tests in CI to prevent regressions
