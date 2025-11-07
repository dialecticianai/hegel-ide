# Toy 1: Electron Shell + Alpine.js + Terminal - Implementation Plan

Test-driven exploration of Electron, Alpine.js, and xterm.js integration.

---

## Overview

**Goal**: Establish working Electron application with Alpine.js reactivity and functional bash terminal.

**Scope**: Minimal viable integration - prove technologies work together, no features beyond foundation.

**Priorities**:
1. Electron launches and loads renderer
2. Alpine.js reactive components work
3. Terminal displays and accepts input
4. Bash process executes commands

**Methodology**:
- Validation-driven development (some components hard to unit test, verify manually)
- Focus on integration points
- Two commits at logical breakpoints (foundation, then terminal feature)
- Conventional commits with toy1 scope

---

## Step 1: Electron Project Setup

### Goal
Initialize Electron project structure with minimal boilerplate.

### Step 1.a: Validation Strategy
Manual verification:
- Package.json exists with electron dependency
- Electron launches without errors
- Window appears with basic HTML loaded
- DevTools accessible for debugging

### Step 1.b: Implementation Tasks
1. Initialize npm project with package.json
2. Install electron as dev dependency
3. Create main.js with basic window setup
4. Create index.html with simple content
5. Add start script to package.json
6. Verify electron launches and displays window

### Success Criteria
- npm start launches Electron window
- Window displays basic HTML content
- No console errors in main or renderer
- DevTools can be opened

---

## Step 2: Alpine.js Integration

### Goal
Prove Alpine.js works in Electron renderer context with basic reactivity.

### Step 2.a: Validation Strategy
Manual verification:
- Alpine.js loads without errors
- Reactive component renders
- User interaction triggers state updates
- DOM updates reflect state changes

Test what's testable:
- Alpine CDN loads successfully
- Component initialization happens
- Click events fire and update state

### Step 2.b: Implementation Tasks
1. Add Alpine.js via CDN to index.html
2. Create simple reactive component (counter button)
3. Add x-data, x-text, and @click directives
4. Verify reactivity works in Electron context
5. Check browser console for any framework errors

### Success Criteria
- Alpine.js loads from CDN successfully
- Counter button increments on click
- DOM updates show current count
- No Alpine-related console errors

**Commit**: feat(toy1): Electron + Alpine.js foundation

---

## Step 3: xterm.js Terminal UI

### Goal
Render xterm.js terminal component in renderer, no bash connection yet.

### Step 3.a: Validation Strategy
Manual verification:
- Terminal element renders in page
- Terminal displays sample text
- Terminal accepts keyboard input
- Terminal scrolls properly

### Step 3.b: Implementation Tasks
1. Install xterm and xterm-addon-fit packages
2. Add xterm CSS to index.html
3. Create terminal container div in HTML
4. Initialize xterm instance in renderer script
5. Mount terminal to container
6. Add fit addon for proper sizing
7. Write sample text to terminal to verify rendering
8. Test keyboard input acceptance

### Success Criteria
- Terminal renders with proper styling
- Sample text displays correctly
- Keyboard input appears in terminal
- Terminal fits container dimensions
- Scrolling works for overflow content

---

## Step 4: Bash Process with node-pty

### Goal
Spawn bash process in main process using node-pty, verify process management.

### Step 4.a: Validation Strategy
Manual verification:
- Bash process spawns successfully
- Process outputs data
- Process accepts input
- Process can be terminated

Testable validation:
- node-pty creates pty without errors
- Spawn returns valid process handle
- Process emits data events

### Step 4.b: Implementation Tasks
1. Install node-pty package
2. Import node-pty in main.js
3. Spawn bash process when window is created
4. Set up data event handler on pty
5. Log bash output to console for verification
6. Test simple command execution (echo test)
7. Verify process termination on window close

### Success Criteria
- Bash process spawns without errors
- Process outputs bash prompt to console
- Simple echo command produces output
- Process terminates cleanly on app quit
- No zombie processes remain

---

## Step 5: IPC Terminal I/O Wiring

### Goal
Connect xterm.js in renderer to bash process in main via IPC channels.

### Step 5.a: Validation Strategy
Manual verification:
- User input in terminal reaches bash process
- Bash output appears in terminal
- Commands execute end-to-end
- ANSI colors/formatting preserved

Integration testing:
- IPC messages send successfully
- Data flows in both directions
- No message loss or corruption

### Step 5.b: Implementation Tasks
1. Set up IPC handler in main.js for terminal input
2. Forward terminal input from renderer to bash via node-pty
3. Set up IPC sender in main.js for terminal output
4. Forward bash output from pty to renderer via IPC
5. Wire up xterm onData event to send input via IPC
6. Wire up IPC receiver in renderer to write output to xterm
7. Add preload script if needed for secure IPC exposure
8. Test full round-trip: type command, see output

### Success Criteria
- Typing in terminal sends data to bash
- Bash output appears in terminal
- Commands like pwd, ls, echo execute correctly
- Command history (arrow keys) works
- Ctrl+C interrupts running process
- Terminal remains responsive after errors

**Commit**: feat(toy1): terminal with bash integration

---

## Success Validation

After completing all steps, verify against SPEC.md success criteria:

- Electron app launches without errors
- index.html loads in renderer process
- Alpine.js executes (reactive component updates DOM)
- xterm.js renders terminal element
- Bash process spawns
- Basic command execution works
- Process can be interrupted

All criteria met = toy exploration complete.

---

## Notes

This is a foundation toy - no product features, just technical validation.

Code will live in root directory (main.js, index.html, renderer.js, package.json).

After completion, write LEARNINGS.md documenting insights, gotchas, and decisions for future reference.

Next toys will build on this foundation (markdown rendering, hegel CLI integration, multi-project UI).
