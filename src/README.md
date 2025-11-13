# src/

Source code directory containing main process and renderer process code.

## Structure

```
src/
├── main.js              Electron main process entry point (delegates to main/)
├── main/                Main process modules (window, terminals, IPC, HTTP server)
│   └── See main/README.md
│
└── renderer/            Frontend application code (Alpine.js + ESM modules)
    └── See renderer/README.md
```

## Build System

Source files are transformed by esbuild (see ../esbuild.js):
- Renderer modules bundled into single dist/renderer.js
- Main process loaded directly by Electron (no bundling)
- Static assets (HTML, CSS) copied to dist/ directory
