# Split-Pane Layout Implementation Plan

Incremental TDD approach to add split-pane layout with draggable divider.

---

## Overview

**Goal**: Replace single-terminal layout with adjustable two-panel layout (Markdown browser left, terminal right).

**Scope**: Six incremental steps building from HTML structure to drag mechanics to hegel integration.

**Priorities**:
1. Terminal continues working (no regression)
2. Layout renders correctly
3. Drag mechanics work smoothly
4. Position persists across sessions
5. Project list populates from hegel CLI

**Methodology**: TDD where it drives development. Write E2E tests for user-facing behavior, skip tests for trivial markup changes. Commit after each numbered step.

---

## Step 1: Update HTML Structure

### Goal
Transform single-container layout into split-pane structure with left panel, divider, and right panel.

### Step 1.a: Write Tests
- Verify split container element exists with correct class
- Verify left pane, divider, and right pane elements render
- Verify terminal container moved inside right pane
- Test uses Playwright to query DOM structure after app launch

### Step 1.b: Implement
- Wrap existing body content in split-container div
- Add left-pane div with placeholder heading and empty project list
- Add divider element between panels
- Move terminal-container inside right-pane div
- Update Alpine.js initialization to use new structure

### Success Criteria
- App launches without errors
- Left pane element exists with class left-pane
- Right pane element exists with class right-pane
- Divider element exists with class divider
- Terminal container exists inside right pane
- Playwright test passes verifying structure

---

## Step 2: Add Split-Pane CSS

### Goal
Style split layout with flexbox, position divider, enable visual resize cursor.

### Step 2.a: Write Tests
- Verify split container has display flex computed style
- Verify divider has column-resize cursor
- Verify panels have non-zero width after render
- Optional: verify initial width ratio approximates sixty-forty

### Step 2.b: Implement
- Add split-container class with flexbox layout and full viewport height
- Style left-pane and right-pane with overflow auto
- Style divider with fixed width, background color, and column-resize cursor
- Add dragging state class for visual feedback during drag

### Success Criteria
- Split container displays as flex row
- Divider shows resize cursor on hover
- Both panels visible with reasonable initial widths
- No layout breaking or overflow issues

---

## Step 3: Implement Alpine Component with State

### Goal
Create Alpine.js reactive component managing split position and localStorage persistence.

### Step 3.a: Write Tests
- Verify Alpine component initializes with default state
- Verify leftPanelPercent defaults to sixty if localStorage empty
- Verify component reads saved position from localStorage on launch
- Verify state changes update panel widths reactively

### Step 3.b: Implement
- Create Alpine component in renderer with splitPane data object
- Initialize leftPanelPercent from localStorage or default to sixty
- Add reactive style bindings to panel width attributes
- Implement init method to load saved position on mount

### Success Criteria
- Component initializes without errors
- Default split position is sixty-forty
- Panel widths update when state changes
- localStorage read on initialization

---

## Step 4: Implement Drag Handlers

### Goal
Enable draggable divider that updates split position and persists to localStorage.

### Step 4.a: Write Tests
- Verify mousedown on divider sets isDragging to true
- Verify mousemove updates leftPanelPercent during drag
- Verify mouseup sets isDragging to false and saves position
- Verify position clamped to reasonable bounds (twenty to eighty percent)
- Test uses Playwright to simulate drag interaction

### Step 4.b: Implement
- Add startDrag method setting isDragging true on divider mousedown
- Add mousemove listener on window calculating new split from mouse X coordinate
- Add mouseup listener on window clearing isDragging and saving to localStorage
- Implement position clamping to prevent extreme splits
- Clean up event listeners on drag end

### Success Criteria
- Divider responds to mouse down
- Panels resize during drag
- Split position clamped between twenty and eighty percent
- Position saved to localStorage on mouse up
- Playwright drag test passes

---

## Step 5: Integrate Hegel CLI for Project List

### Goal
Populate left panel with discovered projects from hegel pm discover command.

### Step 5.a: Write Tests
- Verify component spawns hegel pm discover list command on init
- Verify projects array populates from JSON output
- Verify loading state shows while command runs
- Verify error state shows if command fails or binary missing
- Mock hegel command output for predictable testing

### Step 5.b: Implement
- Add IPC handler in main process to spawn hegel pm discover list with JSON flag
- Parse command stdout as JSON and extract project names array
- Update Alpine component to request projects via IPC on init
- Set projectsLoading true before request, false after response
- Handle errors by setting projectsError message
- Render project list in left panel template

### Success Criteria
- Projects list appears after app launch
- Loading state visible during command execution
- Error message shows if hegel unavailable
- Project names extracted correctly from JSON
- IPC integration test passes

---

## Step 6: Verify Terminal Functionality

### Goal
Ensure existing terminal tests still pass with new layout structure.

### Step 6.a: Write Tests
- Run existing terminal E2E test suite
- Verify terminal presence tests pass (container exists, xterm rendered)
- Verify terminal I/O tests pass (echo command, pwd command, sequential commands)
- Fix any test selectors broken by DOM restructuring

### Step 6.b: Implement
- Update terminal initialization if container query changed
- Fix any broken test selectors in terminal spec files
- Verify terminal still receives focus and input correctly
- Ensure fit addon resizes terminal within right pane

### Success Criteria
- All existing terminal tests pass
- Terminal accepts input and displays output
- Terminal resizes correctly in right pane
- No regression in terminal functionality

---

## Commit Strategy

Group related steps into logical commits for coherent history:

**Commit 1**: Steps 1-3 - `feat(split-pane): add split-pane layout structure and state`
- HTML structure, CSS styling, Alpine component with persistence

**Commit 2**: Step 4 - `feat(split-pane): implement draggable divider`
- Drag handlers and position clamping

**Commit 3**: Step 5 - `feat(split-pane): integrate hegel project discovery`
- CLI integration and project list rendering

**Commit 4**: Step 6 - `test(split-pane): verify terminal functionality`
- Terminal regression fixes if needed

Run full E2E suite before each commit to ensure nothing breaks.

---

## Testing Philosophy

**Test what matters**:
- User interactions: drag, resize, reload persistence
- Integration points: hegel CLI, terminal functionality
- Error paths: missing localStorage, hegel command failure

**Skip testing**:
- Trivial markup presence (unless it breaks functionality)
- Exact pixel widths (use approximate bounds)
- CSS computed values (unless critical to functionality)
- Internal Alpine reactivity (framework responsibility)

**TDD discipline**:
- Write E2E tests for Steps one, three, four, five, six
- Step two (CSS) is mostly visual, minimal testing
- Each test validates behavior, not implementation

**E2E test execution strategy**:
- **During iteration**: Run only the relevant test file for current step
  - Step 1: `npx playwright test e2e/app.spec.js` (verify structure)
  - Steps 3-4: Create new `e2e/split-pane.spec.js`, run only that file
  - Step 5: Run `e2e/split-pane.spec.js` with project list tests
  - Step 6: Run `e2e/terminal.spec.js` only
- **Before commit**: Run full suite `npm test` to catch regressions
- **Rationale**: E2E tests are slow, focused execution speeds up iteration

---

## Risk Mitigation

**Terminal regression**: Step six explicitly validates no breakage
**Drag performance**: Simple implementation first, optimize if needed
**localStorage errors**: Graceful fallback to defaults
**Hegel unavailable**: Error state in UI, app remains functional

---

## Notes

**Why six steps**: Each step is independently testable and committable
**Why E2E over unit**: UI behavior matters more than isolated functions
**Why localStorage first**: Simpler than userData, sufficient for now
**Why sixty-forty default**: Balances markdown reading space with terminal usability
