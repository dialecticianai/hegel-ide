# UI Tabs Implementation Plan

Test-driven implementation of tab bars for both split panels, enabling multiple project views and terminal sessions.

---

## Overview

**Goal**: Add tab management to left panel (projects/details) and right panel (multiple terminals).

**Scope**: Tab UI components, Alpine.js state management, multi-terminal IPC infrastructure, project detail fetching with caching, Playwright E2E validation.

**Priorities**:
1. Non-breaking changes to existing functionality
2. Multi-terminal IPC routing by terminalId
3. Tab UI and state management
4. E2E test coverage for tab operations

**Methodology**: TDD where tests drive development (tab operations, terminal creation, project fetching). Steps grouped into 4 commits for clean git history.

---

## Step 1: Tab Bar HTML Structure and CSS

### Goal
Establish visual tab bar foundation for both panels without breaking existing layout.

### Step 1.a: Write Tests
No automated tests for this step. Validation deferred to Step 2 Playwright tests which will verify tab bar rendering and layout integrity.

### Step 1.b: Implement
Modify index.html to add tab bar structure above content in both left-pane and right-pane divs. Add CSS classes for tab-bar, tabs-list, tab, active tab state, close-tab button, add-tab button, and tab-content wrapper. Wrap existing Projects list and terminal container in tab-content divs. Add style rules matching VS Code dark theme aesthetic.

### Success Criteria
- App launches without errors
- Tab bars visible in both panels
- Existing Projects list renders in left panel
- Existing Terminal 1 functional in right panel
- Split-pane drag still works

---

## Step 2: Alpine.js Tab State Management

### Goal
Add reactive tab arrays and active tab tracking to Alpine component. Enable tab switching without implementing add/close yet.

### Step 2.a: Write Tests
Playwright test verifying:
- Default tabs exist in leftTabs and rightTabs arrays
- Clicking tab updates active state
- Active tab content displays, inactive content hidden
- Tab gets active CSS class when selected

### Step 2.b: Implement
Extend splitPane Alpine component with new state fields: leftTabs, rightTabs, activeLeftTab, activeRightTab. Initialize with default tabs (Projects non-closeable, Terminal 1 non-closeable). Add Alpine methods: switchLeftTab, switchRightTab. Wire up click handlers in HTML. Use Alpine x-show directives to toggle content visibility based on active tab.

### Success Criteria
- Playwright test passes for tab switching
- Clicking Projects tab (even though only tab) doesn't error
- Terminal remains functional after Alpine changes
- Active tab visually distinct

**COMMIT 1**: `feat(ui-tabs): add tab UI foundation with Alpine state management`
- Groups Steps 1-2: Tab bar HTML/CSS structure + reactive behavior

---

## Step 3: Multi-Terminal IPC Infrastructure

### Goal
Modify IPC messages to route terminal input/output/resize by terminalId. Support multiple pty processes in main.js.

### Step 3.a: Write Tests
No direct tests for IPC changes. Validation comes from terminal functionality tests in later steps. Ensure existing terminal still works after IPC modifications (covered by existing e2e/terminal.spec.js tests).

### Step 3.b: Implement
Modify main.js to track multiple pty processes in a Map keyed by terminalId. Update terminal-input handler to route data to specific pty using terminalId from message. Update terminal-output to include terminalId when sending to renderer. Update terminal-resize handler to resize specific pty. Add create-terminal IPC handler that spawns new pty with given terminalId. Add close-terminal IPC handler that kills pty and removes from map. Initialize default Terminal 1 pty with terminalId term-1.

Modify renderer.js terminal initialization to send terminalId with input/resize messages. Update terminal-output listener to check terminalId and route to correct Terminal instance.

### Success Criteria
- Existing e2e/terminal.spec.js tests still pass
- Terminal 1 input/output functional after IPC changes
- No errors in console during terminal operations

---

## Step 4: Add Terminal Tab Functionality

### Goal
Enable adding new terminal tabs via plus button. Each terminal gets unique ID and independent pty session.

### Step 4.a: Write Tests
Playwright test verifying:
- Plus button exists in right panel tab bar
- Clicking plus creates new terminal tab (Terminal 2)
- New tab appears in tabs list
- New terminal accepts input and produces output independently
- Switching between Terminal 1 and Terminal 2 preserves separate histories
- Terminal 2 visible container renders correctly

### Step 4.b: Implement
Add terminals Map field to Alpine component for tracking Terminal.js instances. Add nextTerminalNumber counter starting at 2. Implement addTerminalTab method: generate unique terminalId, increment counter, create tab object with closeable true, invoke create-terminal IPC, create new Terminal instance, mount to dynamically-generated container ID, store in terminals map, fit to container, set up IPC listeners with terminalId, switch to new tab.

Update terminal initialization to store Terminal 1 in terminals map. Modify tab switching for terminals to call fit on active terminal after switch.

### Success Criteria
- Playwright test passes for adding and using multiple terminals
- Terminal 2 has fresh bash session
- Typing in Terminal 1 doesn't affect Terminal 2
- Each terminal maintains separate command history
- Fit addon resizes terminal correctly on tab switch

---

## Step 5: Close Terminal Tab Functionality

### Goal
Enable closing terminal tabs via close button. Clean up Terminal instances and pty processes.

### Step 5.a: Write Tests
Playwright test verifying:
- Terminal 1 has no close button (non-closeable)
- Terminal 2 has close button
- Clicking close button removes Terminal 2 tab
- Terminal 1 remains functional after closing Terminal 2
- If active tab closed, switches to first tab
- Creating Terminal 3 after closing Terminal 2 works correctly

### Step 5.b: Implement
Implement closeRightTab method: verify tab is closeable, remove from rightTabs array, if closing active tab switch to first tab, invoke close-terminal IPC with terminalId, dispose Terminal instance via term.dispose(), remove from terminals map. Update tab bar HTML to conditionally show close button using x-show on tab.closeable. Use click.stop on close button to prevent tab switch.

### Success Criteria
- Playwright test passes for closing terminal tabs
- Terminal 1 cannot be closed
- Terminal 2 closes without errors
- No zombie pty processes after close
- No memory leaks from Terminal instances

**COMMIT 2**: `feat(ui-tabs): implement multi-terminal tab features`
- Groups Steps 3-5: IPC infrastructure + add/close terminal tabs

---

## Step 6: Project Detail Tab Functionality

### Goal
Enable opening project detail tabs from project list. Fetch data via hegel pm discover show with caching.

### Step 6.a: Write Tests
Playwright test verifying:
- Clicking project name in list creates new tab
- Tab shows loading state initially
- Tab displays JSON data after load
- Project tab has close button
- Clicking same project twice switches to existing tab (no duplicate)
- Closing project tab removes it
- Reopening closed project tab shows cached data instantly

### Step 6.b: Implement
Add projectDetails map field to Alpine component for caching. Add get-project-details IPC handler in main.js: spawn hegel pm discover show command, parse JSON output, return data or error. Implement openProjectTab method: check if tab exists and switch if so, otherwise create tab object with projectName field, push to leftTabs, switch to tab, check cache, fetch if not cached. Implement fetchProjectDetails method: set loading state, invoke IPC, update cache with data or error.

Update left panel tab content area to loop through project-detail tabs and display data from projectDetails cache. Show loading message, error message, or JSON data based on cache state.

### Success Criteria
- Playwright test passes for opening project tabs
- Project detail data displays correctly
- Cache works (instant reopen)
- Multiple project tabs can coexist
- Errors handled gracefully if hegel command fails

---

## Step 7: Refresh Button for Project Details

### Goal
Add refresh button to project detail tabs to fetch fresh data on demand.

### Step 7.a: Write Tests
Playwright test verifying:
- Refresh button visible in project detail tab
- Button shows Loading state when clicked
- Button disabled during loading
- Fresh data loads after refresh
- Multiple refreshes work correctly

### Step 7.b: Implement
Implement refreshProjectDetails method: reuse fetchProjectDetails logic with force refresh flag. Add refresh button to project detail tab content area header. Wire up click handler to refreshProjectDetails method. Use Alpine disabled binding based on loading state. Update button text based on loading state.

Add CSS for refresh-button class with proper hover and disabled states.

### Success Criteria
- Playwright test passes for refresh functionality
- Button disabled during fetch
- Fresh data loads on refresh
- No errors on multiple rapid refreshes

---

## Step 8: Close Project Tab Functionality

### Goal
Enable closing project detail tabs via close button. Main Projects tab remains non-closeable.

### Step 8.a: Write Tests
Playwright test verifying:
- Projects main tab has no close button
- Project detail tabs have close button
- Clicking close removes tab
- If active tab closed, switches to Projects tab
- Projects tab still functional after closing detail tab

### Step 8.b: Implement
Implement closeLeftTab method: verify tab closeable, remove from leftTabs array, if closing active tab switch to projects tab. Update tab bar HTML to conditionally show close button. Use click.stop on close button to prevent tab switch.

No need to clean up cached data (keep in cache for fast reopen).

### Success Criteria
- Playwright test passes for closing project tabs
- Projects tab cannot be closed
- Project detail tabs close cleanly
- No errors after closing tabs

**COMMIT 3**: `feat(ui-tabs): implement project detail tab features`
- Groups Steps 6-8: Open/fetch/cache + refresh button + close project tabs

---

## Step 9: Tab Overflow Handling

### Goal
Handle many tabs with horizontal scrollbar on tab bar.

### Step 9.a: Write Tests
Playwright test verifying:
- Opening many tabs (10+) causes horizontal scroll
- All tabs remain accessible via scroll
- Plus button remains visible
- Scrolling doesn't break tab switching

### Step 9.b: Implement
Add overflow-x auto CSS to tabs-list class. Verify plus button stays visible with justify-content space-between on tab-bar. Test with many project tabs to ensure scroll works.

### Success Criteria
- Horizontal scrollbar appears with many tabs
- All tabs accessible
- Plus button visible
- Tab switching works when scrolled

---

## Step 10: Integration Testing

### Goal
Comprehensive E2E validation of all tab operations. Ensure no regressions.

### Step 10.a: Write Tests
Comprehensive Playwright test suite covering:
- Default tab initialization
- Left and right panel tab operations independent
- Terminal operations across multiple terminals
- Project tab operations with caching
- Edge cases: closing active tabs, overflow, rapid operations
- Existing tests still pass (no regressions)

Run full test suite: npm test

### Step 10.b: Implement
Fix any issues found during comprehensive testing. Address memory leaks if detected. Fix console errors. Ensure split-pane drag still works with tabs. Ensure terminal fit works correctly on window resize with multiple terminals.

### Success Criteria
- All Playwright tests pass
- No console errors
- No memory leaks detected
- Existing functionality unbroken (split-pane drag, terminal operations)

**COMMIT 4**: `test(ui-tabs): add comprehensive E2E tests and fix issues`
- Groups Steps 9-10: Tab overflow handling + integration testing

---

## Final Success Criteria

All criteria must be verified before feature completion:

- Tab bars render in both panels
- Default tabs load on startup (Projects, Terminal 1)
- Can add new terminal tabs via plus button
- Each terminal has independent bash session
- Can close terminal tabs (except Terminal 1)
- Can open project detail tabs from project list
- Project detail data fetches and displays
- Project detail data caches for fast reopen
- Refresh button fetches fresh data
- Can close project detail tabs (except Projects)
- Tab overflow shows horizontal scroll
- All Playwright tests pass
- No regressions in existing functionality
- No console errors or memory leaks
