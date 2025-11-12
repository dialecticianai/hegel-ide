# src/renderer/

Frontend application code using ESM modules bundled with esbuild. Each module exports factory functions that return Alpine.js reactive state and methods.

## Structure

```
renderer/
├── index.js                     Bundle entry point (imports all modules, initializes Alpine and IPC listeners)
├── index.html                   Application HTML with split-pane layout and review tabs
├── styles.css                   All application CSS (includes review tab styles)
│
├── split-pane.js                Split pane drag handlers and localStorage persistence
├── tabs.js                      Tab management (file, review, project, settings tabs) and review IPC listener
├── terminals.js                 Terminal creation, initialization, and IPC handling
├── projects.js                  Project discovery, details fetching, file operations
├── markdown.js                  Markdown rendering and dev tools utilities
├── markdown-line-tracking.js    Line-tracked markdown parsing for review mode
├── markdown-utils.js            Shared markdown path resolution and URL transformation helpers
├── themes.js                    Theme management with localStorage and system preference tracking
│
└── app.js                       Legacy IIFE version (kept temporarily, not used)
```

## Module Pattern

Modules export factory functions that return Alpine.js reactive objects:

```javascript
export function createModuleName() {
  return {
    // State
    someState: initialValue,

    // Methods
    someMethod() { /* ... */ }
  };
}
```

## Bundling

All modules imported and composed in index.js:
- Alpine.js bundled from npm (not CDN)
- Node modules marked external (electron, @xterm/*, dayjs, marked, os)
- Single bundle output: dist/renderer.js
- Build command: `npm run build`

## Composition

index.js merges all factory functions into single Alpine.data('splitPane') component using object spread, providing unified reactive state for the application.
