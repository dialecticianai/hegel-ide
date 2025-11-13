# src/main/

Electron main process modules organized by concern (window, terminal, HTTP, IPC handlers).

## Structure

```
main/
├── index.js            App orchestration layer (lifecycle, module coordination)
├── window.js           BrowserWindow creation and management
├── terminal.js         PTY spawning, foreground process detection, lifecycle
├── http-server.js      HTTP server for review tab integration
├── hegel.js            Reusable hegel command spawner (DRY helper)
│
└── ipc-handlers/       IPC handlers organized by domain
    └── See ipc-handlers/README.md
```

## Module Responsibilities

**index.js**: Coordinates all modules, registers IPC handlers, manages app lifecycle events

**window.js**: Creates Electron BrowserWindow, manages window state and lifecycle

**terminal.js**: Spawns PTY processes, detects foreground processes, manages terminal lifecycle

**http-server.js**: Creates HTTP server for review endpoint, handles /review POST requests

**hegel.js**: Extracts duplicated hegel spawn pattern into reusable helper (JSON parsing, stdin, error handling)

**ipc-handlers/**: Domain-specific IPC handlers (projects, terminals, files, reviews, utils)
