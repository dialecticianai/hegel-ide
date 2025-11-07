# Toy 2: Playwright E2E Testing - Specification

Explore automated testing capabilities for Electron app with Playwright.

---

## Overview

**What it does**: Establish Playwright test infrastructure and discover what toy1 functionality can be reliably tested with E2E automation.

**Key principles**:
- Test our integration code, not third-party library internals (xterm, Alpine)
- Verify we wrap xterm correctly (initialization, IPC wiring, input/output flow)
- Focus on critical paths: app launch, terminal I/O, UI reactivity
- Document what's testable vs. what requires manual verification
- Keep tests fast and reliable

**Scope**:
- Playwright for Electron setup
- E2E tests for toy1 features (Electron shell, Alpine.js, terminal)
- Test coverage assessment (what works, what doesn't)
- NO production test harness yet - pure exploration

**Integration context**:
- Tests toy1's existing functionality (main.js, renderer.js, index.html)
- No changes to toy1 code required
- Tests run independently via Playwright

---

## Test Coverage Goals

### Target Tests

**1. Application Launch**
- Electron app starts without errors
- Main window appears
- Window has correct title ("Hegel IDE")
- DevTools can be detected (optional assertion)

**2. Alpine.js Reactivity**
- Counter button exists in DOM
- Button displays initial count (0)
- Clicking button increments count
- DOM updates reflect new count value

**3. Terminal Presence**
- Terminal container element exists
- xterm.js canvas/DOM elements rendered
- Terminal has visible dimensions

**4. Terminal I/O**
- Terminal accepts text input
- Simple command (echo test) produces output
- Output appears in terminal DOM
- Multiple commands in sequence work
- Directory-based commands work (pwd, ls)

### Challenging/Uncertain Tests

**May be difficult to test reliably**:
- Terminal resize on window resize (timing/async issues)
- Ctrl+C process interruption (keyboard simulation complexity)
- Command history with arrow keys (terminal state inspection)
- Long-running process output streaming

### Out of Scope

- xterm.js internal functionality (ANSI color rendering, cursor behavior, text selection)
- Alpine.js internal reactivity mechanisms
- Performance testing (terminal rendering speed)
- Memory leak detection
- Cross-platform testing (macOS/Linux/Windows)
- Visual regression testing
- Accessibility testing

---

## Data Model

### Playwright Test Structure

**Test file organization**:
```
e2e/
├── app.spec.js          # App launch and window tests
├── alpine.spec.js       # Alpine.js reactivity tests
└── terminal.spec.js     # Terminal I/O tests
```

**Test configuration** (playwright.config.js):
```javascript
{
  testDir: './e2e',
  timeout: 30000,
  use: {
    electronPath: require('electron'),
    electronArgs: ['.']
  }
}
```

---

## Core Operations

### Operation: Run All Tests

**Syntax**: `npm test`

**Behavior**:
- Launches Electron app via Playwright
- Runs all test files in e2e/ directory
- Reports pass/fail for each test
- Exits with code 0 (success) or 1 (failure)

**Example output**:
```
Running 8 tests

  ✓ app launches successfully
  ✓ window has correct title
  ✓ counter button exists
  ✓ clicking counter increments
  ✓ terminal container exists
  ✓ echo command produces output
  ✓ pwd shows current directory
  ⨯ ctrl+c interrupts process (timeout)

7 passed, 1 failed
```

---

### Operation: Run Specific Test File

**Syntax**: `npx playwright test e2e/terminal.spec.js`

**Behavior**: Runs only terminal-related tests

---

### Operation: Debug Test

**Syntax**: `npx playwright test --debug`

**Behavior**:
- Launches Playwright inspector
- Steps through test execution
- Allows DOM inspection
- Useful for understanding test failures

---

## Test Scenarios

### Simple: App Launch

**Test**: Electron app starts and main window appears

**Steps**:
1. Launch Electron via Playwright
2. Wait for window to be visible
3. Assert window exists
4. Assert window title is "Hegel IDE"

**Expected**: Test passes, app launches cleanly

---

### Complex: Terminal Command Execution

**Test**: Execute bash command and verify output appears

**Steps**:
1. Launch Electron app
2. Wait for terminal element to be present
3. Focus terminal (click or programmatic focus)
4. Type command: `echo "hello playwright"`
5. Press Enter
6. Wait for output to appear in terminal DOM
7. Assert terminal contains text "hello playwright"

**Expected**: Command executes, output visible in terminal

---

### Error: Timeout on Long Command

**Test**: Verify test timeout behavior for slow commands

**Steps**:
1. Launch Electron app
2. Type command: `sleep 100`
3. Press Enter
4. Set short timeout (5 seconds)
5. Attempt to assert completion

**Expected**: Test fails with timeout error, documents limitation

---

## Success Criteria

Agent-verifiable:

- Playwright for Electron installed successfully
- Test suite runs: `npm test` executes without setup errors
- App launch tests pass: Electron starts, window appears
- Alpine.js tests pass: Counter button exists and increments
- Basic terminal tests pass: Terminal element exists
- Simple terminal I/O test passes: `echo` command produces output
- Complex terminal I/O test passes: `pwd` or `ls` produces expected output
- At least one test documented as unreliable/impossible (e.g., Ctrl+C, arrow keys)

---

## Learnings to Capture

**Document in LEARNINGS.md**:
- What percentage of toy1 functionality is testable?
- Which tests are reliable vs. flaky?
- What requires manual verification?
- Playwright limitations discovered
- Test execution speed (is it fast enough for TDD?)
- Recommendations: should we invest in E2E for hegel-ide?

---

## Out of Scope

- xterm.js internal functionality (testing xterm's correctness is their job, not ours)
- Comprehensive test coverage (this is exploration, not production)
- Test infrastructure optimization
- CI/CD integration
- Test parallelization
- Visual regression testing tools
- Mocking/stubbing (test real app behavior)
