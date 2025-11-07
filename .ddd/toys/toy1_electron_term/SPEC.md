# Toy 1: Electron Shell + Alpine.js + Terminal Specification

Verify Electron + Alpine.js integration and establish working xterm.js terminal.

---

## Overview

**What it does**: Minimal Electron application with Alpine.js reactivity and a functional bash terminal using xterm.js.

**Key principles**:
- Prove Electron + Alpine.js works together
- Establish xterm.js + node-pty integration for bash execution
- No complexity beyond basic wiring
- Foundation for future markdown viewer and hegel integration

**Scope**:
- Electron main/renderer process setup
- Alpine.js basic reactivity (prove it works)
- xterm.js terminal component with live bash session
- Window management (single window, basic chrome)

**Integration context**:
- This is foundational — no integration with hegel yet
- Terminal will eventually run `hegel` commands
- Alpine state management will eventually coordinate multi-project UI

---

## Data Model

No persistent data for this toy. Ephemeral state only:

**Alpine.js Component State** (renderer process):
```javascript
{
  terminalReady: false,      // boolean: terminal initialized
  shellConnected: false,     // boolean: bash process running
  currentDir: "/path/to/cwd" // string: current working directory (from env)
}
```

**IPC Messages** (main ↔ renderer):
```javascript
// Main → Renderer
{
  type: "terminal-data",
  data: "output string from bash"
}

// Renderer → Main
{
  type: "terminal-input",
  data: "user input string\n"
}
```

---

## Core Operations

### Operation: Launch Electron App

**Behavior**:
- Creates main window (800x600, resizable)
- Loads `index.html` in renderer process
- Sets up IPC handlers for terminal I/O
- Spawns bash process using node-pty
- Connects bash stdout/stderr to renderer via IPC

**Validation**:
- Window appears
- No console errors
- DevTools accessible (for debugging)

---

### Operation: Alpine.js Reactivity Test

**Behavior**:
- Simple reactive component in UI
- State changes trigger DOM updates
- Proves Alpine works in Electron renderer context

**Example**:
```html
<div x-data="{ count: 0 }">
  <button @click="count++">Clicked: <span x-text="count"></span></button>
</div>
```

**Validation**:
- Button click increments counter
- DOM updates reactively
- No framework errors in console

---

### Operation: Terminal Interaction

**Syntax**: User types commands in xterm.js terminal

**Behavior**:
- User input sent from renderer → main via IPC
- Main process forwards to bash via node-pty
- Bash output sent from main → renderer via IPC
- xterm.js displays output with proper formatting

**Examples**:

Simple command:
```bash
$ pwd
/Users/emadum/Code/github.com/dialecticianai/hegel-ide
```

Interactive command:
```bash
$ ls -la
total 32
drwxr-xr-x   7 user  staff   224 Nov  6 12:00 .
drwxr-xr-x  10 user  staff   320 Nov  6 11:00 ..
-rw-r--r--   1 user  staff   123 Nov  6 12:00 .gitignore
-rw-r--r--   1 user  staff  1234 Nov  6 12:00 ARCHITECTURE.md
```

**Validation**:
- Commands execute in bash process
- Output appears in terminal
- Colors/formatting preserved (ANSI codes)
- Ctrl+C interrupts running processes
- Terminal scroll works for long output

---

## Test Scenarios

### Simple: Launch and Verify

1. Run `npm start` (or electron launch command)
2. Window opens with terminal visible
3. Alpine.js test component works (button increments counter)
4. Terminal shows bash prompt

**Expected**: All components render, no errors

---

### Complex: Terminal Session

1. Launch app
2. Type `pwd` in terminal, press Enter
3. Verify current directory prints
4. Type `echo "hello world"`, press Enter
5. Verify output appears
6. Type `ls`, press Enter
7. Verify file listing appears
8. Use arrow keys to navigate command history
9. Type `cat VISION.md | head -5`, press Enter
10. Verify first 5 lines of VISION.md display

**Expected**: Full bash session functionality works

---

### Error: Process Management

1. Launch app
2. Type `sleep 100`, press Enter
3. Press Ctrl+C
4. Verify sleep process terminates
5. Verify terminal remains responsive
6. Type `echo "still alive"`, press Enter
7. Verify output appears

**Expected**: Process interruption works, terminal stays functional

---

## Success Criteria

Agent-verifiable:
- Electron app launches without errors: `npm start` succeeds
- index.html loads in renderer process (check window.document title)
- Alpine.js executes (reactive component updates DOM)
- xterm.js renders terminal element (canvas/DOM element exists)
- Bash process spawns (node-pty creates pty)
- Basic command execution works (`echo test` produces output)
- Process can be interrupted (bash doesn't hang on Ctrl+C)

---

## Out of Scope

- Multiple terminals/tabs
- Terminal customization (themes, fonts)
- Command history persistence
- Integration with hegel CLI
- Markdown rendering
- Multi-project management
- Error recovery/robustness
- Performance optimization
- Production packaging/distribution

---

## Dependencies

**New packages required**:
- `electron` - Application platform
- `alpinejs` - Lightweight reactive framework
- `xterm` - Terminal emulator for web
- `xterm-addon-fit` - Auto-resize terminal to container
- `node-pty` - Pseudoterminal for spawning bash

**File structure** (minimal):
```
/
├── main.js           # Electron main process
├── renderer.js       # Alpine.js components, xterm setup
├── index.html        # Entry point for renderer
├── package.json      # Dependencies and scripts
└── .ddd/toys/
    ├── SPEC.md       # This file
    ├── PLAN.md       # To be written
    └── LEARNINGS.md  # To be written
```

---

## Notes

This toy establishes technical foundation only. No product features yet.

Terminal implementation will eventually run `hegel status`, `hegel next`, etc., but for this toy we just need bash working.

Alpine.js test component proves integration works - actual UI design comes later.
