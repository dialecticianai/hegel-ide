# Hegel IDE

Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

## Current Status

Basic Electron shell with integrated terminal. Alpine.js for lightweight UI reactivity.

## Setup

```bash
npm install
npx electron-rebuild  # Required after install for native modules
npm start
```

## Architecture

- **Electron**: Cross-platform app shell
- **Alpine.js**: Lightweight reactive UI (CDN-loaded, no build step)
- **xterm.js (@xterm/xterm)**: Terminal emulator
- **node-pty**: Bash process spawning and I/O
- **IPC**: Simple send/receive for terminal communication (nodeIntegration enabled, contextIsolation disabled)

## Current Features

- Functional bash terminal with xterm.js
- IPC-based terminal I/O (renderer ↔ main process ↔ bash)
- Terminal auto-resize on window resize
- Alpine.js reactive component integration verified

## Known Limitations

- Native modules require `@electron/rebuild` after npm install
- Security model uses insecure IPC (acceptable for internal tool, revisit for distribution)
- Terminal features not fully validated (Ctrl+C interruption, command history, long output handling untested)

## Dependencies

- `electron` - Application platform
- `@xterm/xterm`, `@xterm/addon-fit` - Terminal UI
- `node-pty` - Pseudoterminal for bash
- `alpinejs` - Loaded via CDN

## License

SSPL
