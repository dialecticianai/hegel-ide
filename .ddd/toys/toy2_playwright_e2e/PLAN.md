# Toy 2: Playwright E2E Testing - Implementation Plan

Exploration of Playwright test infrastructure for Electron app testing.

---

## Overview

**Goal**: Set up Playwright for Electron and discover what percentage of toy1's functionality can be reliably tested.

**Scope**: Test infrastructure setup, write tests for app launch, Alpine.js reactivity, and terminal I/O. Document what works vs. what doesn't.

**Priorities**:
1. Get Playwright running with Electron
2. Test critical integration points (IPC, terminal I/O)
3. Identify testing gaps and limitations
4. Assess viability for hegel-ide TDD workflow

**Methodology**:
- Validation-driven exploration (test real functionality, document what's untestable)
- Focus on our integration code, not third-party library internals
- One commit after setup and basic tests, another after full exploration
- Conventional commits with toy2 scope

---

## Step 1: Playwright Setup

### Goal
Install Playwright for Electron and verify test infrastructure works.

### Step 1.a: Installation and Configuration
Install Playwright and configure for Electron testing. Create playwright config file specifying Electron path and test directory. Set up test script in package.json.

### Step 1.b: Verification
Write minimal smoke test that launches Electron app and verifies window appears. Run test to confirm Playwright can control Electron.

### Success Criteria
- Playwright packages installed
- Config file created with Electron settings
- npm test runs Playwright
- Smoke test passes (app launches, window visible)

---

## Step 2: Application Launch Tests

### Goal
Verify Electron app launches correctly via Playwright automation.

### Step 2.a: Test Strategy
Create app launch test file. Test that app starts without errors, main window appears with correct title. Verify window is visible and has expected properties.

### Step 2.b: Implementation
Write test file for app launch scenarios. Use Playwright API to launch Electron, wait for window, assert on window properties. Handle async window creation.

### Success Criteria
- App launch test file exists
- Test verifies window appears
- Test checks window title is correct
- Test passes reliably

---

## Step 3: Alpine.js Reactivity Tests

### Goal
Test that Alpine.js integration works (our wiring, not Alpine's internals).

### Step 3.a: Test Strategy
Verify counter button exists in DOM. Test that clicking button triggers state update and DOM reflects new count. Focus on testing our Alpine integration, not Alpine itself.

### Step 3.b: Implementation
Write tests that locate counter button element, simulate click, and verify text content updates. Use Playwright selectors to find Alpine-controlled elements.

### Success Criteria
- Alpine test file exists
- Test finds counter button in DOM
- Test clicks button and verifies count increments
- Test confirms DOM updates reactively

---

## Step 4: Terminal Presence Tests

### Goal
Verify xterm.js terminal renders and is present in DOM.

### Step 4.a: Test Strategy
Check that terminal container exists. Verify xterm elements (canvas or DOM nodes) are rendered. Confirm terminal has visible dimensions.

### Step 4.b: Implementation
Write tests using Playwright selectors to find terminal container and xterm-specific elements. Assert on element visibility and dimensions.

### Success Criteria
- Terminal presence test file exists
- Test locates terminal container
- Test verifies xterm DOM elements present
- Terminal has non-zero dimensions

**Commit**: test(toy2): Playwright setup and basic UI tests

---

## Step 5: Terminal I/O Tests

### Goal
Test terminal input/output flow (our IPC wiring, not xterm's terminal emulation).

### Step 5.a: Test Strategy
Test simple command execution: type echo command, press Enter, verify output appears. Test sequential commands to ensure IPC remains functional. Try directory commands like pwd and ls.

### Step 5.b: Implementation
Write tests that simulate typing into terminal, sending Enter keypress, and waiting for output to appear in terminal DOM. Use Playwright keyboard API for input simulation. Use text content or accessible queries to verify output.

### Success Criteria
- Terminal I/O test file exists
- Test types command and presses Enter
- Test verifies output appears in terminal
- Test handles sequential commands
- Tests pass reliably without flakiness

---

## Step 6: Advanced Terminal Tests (Challenging)

### Goal
Attempt tests for difficult scenarios and document what fails.

### Step 6.a: Exploration
Try testing Ctrl+C interruption, command history with arrow keys, terminal resize. Expect some or all to fail. Document why they fail and whether failures are acceptable.

### Step 6.b: Implementation
Write tests for advanced scenarios with expectation they may not work. When tests fail, document the limitation in test file or LEARNINGS. Determine if manual verification is acceptable for these cases.

### Success Criteria
- At least one advanced scenario attempted
- Failures documented with rationale
- Assessment made: manual verification acceptable or automation needed

**Commit**: test(toy2): terminal I/O tests and exploration of testing limits

---

## Success Validation

After completing all steps, assess against SPEC criteria:

- Playwright runs tests successfully
- App launch tests pass
- Alpine.js tests pass
- Terminal presence tests pass
- At least one terminal I/O test passes
- Documented: what's testable vs. untestable
- Assessment complete: E2E testing viable for hegel-ide?

All exploration complete, ready for LEARNINGS documentation.

---

## Notes

This is pure exploration - no production test infrastructure decisions yet.

Goal is to understand Playwright capabilities and limitations for Electron/terminal testing.

LEARNINGS should capture: test reliability, execution speed, coverage gaps, and recommendation on E2E investment.
