# ESBuild Migration Specification

Migrate hegel-ide from IIFE modules with script tags to ESM modules with esbuild bundling, reorganize into `/src` directory structure, and bundle Alpine.js locally.

---

## Overview

**What it does:** Modernizes the frontend build system by converting IIFE modules to ESM, introducing a build step with esbuild, and reorganizing code into a standard src/ structure.

**Key principles:**
- Minimal scope: bundle renderer only, defer security improvements
- Preserve existing architecture: keep nodeIntegration, no preload script yet
- Clean separation: source in src/, artifacts in dist/
- One change at a time: no TypeScript, no major refactoring

**Scope:** Convert 7 renderer modules from IIFE to ESM, set up esbuild bundling, reorganize directory structure, bundle Alpine.js locally.

**Integration context:** Electron renderer code only. Main process code moves location but remains unchanged in behavior. Build integrates with existing npm scripts and testing infrastructure.

---

## Directory Structure

### Current Structure
```
hegel-ide/
├── main.js                    # Main process entry
├── index.html                 # Renderer HTML
├── styles.css                 # Renderer styles
├── lib/                       # Renderer modules (IIFE)
│   ├── app.js
│   ├── split-pane.js
│   ├── tabs.js
│   ├── terminals.js
│   ├── projects.js
│   ├── markdown.js
│   └── themes.js
└── package.json
```

### Target Structure
```
hegel-ide/
├── src/
│   ├── main.js                # MOVED: Main process entry
│   └── renderer/              # MOVED + CONVERTED: ESM modules
│       ├── index.js           # NEW: Entry point, imports all modules
│       ├── app.js
│       ├── split-pane.js
│       ├── tabs.js
│       ├── terminals.js
│       ├── projects.js
│       ├── markdown.js
│       ├── themes.js
│       ├── index.html         # MOVED: Renderer HTML
│       └── styles.css         # MOVED: Renderer styles
├── dist/                      # NEW: Build artifacts (gitignored)
│   ├── renderer.js            # Bundled renderer code
│   ├── index.html             # Copied from src/renderer/
│   └── styles.css             # Copied from src/renderer/
├── esbuild.js                 # NEW: Build script
└── package.json               # MODIFIED: updated scripts, main path, dependencies
```

---

## Module Format Changes

### Current: IIFE with Namespace Pattern

**Example (lib/themes.js):**
```javascript
(function(global) {
  'use strict';

  function createThemes() {
    return {
      currentTheme: 'auto',
      initTheme() { /* ... */ }
    };
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createThemes = createThemes;
})(window);
```

**Usage (lib/app.js):**
```javascript
const themes = global.HegelIDE.createThemes();
```

### Target: ESM Modules

**Example (src/renderer/themes.js):**
```javascript
export function createThemes() {
  return {
    currentTheme: 'auto',
    initTheme() { /* ... */ }
  };
}
```

**Usage (src/renderer/index.js):**
```javascript
import { createThemes } from './themes.js';
// ... other imports
```

**Pattern for all modules:**
- Remove IIFE wrapper
- Export factory functions directly
- Import dependencies explicitly
- No window.HegelIDE namespace

---

## Alpine.js Integration

### Current: CDN
```html
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

### Target: Bundled

**Install:**
```bash
npm install alpinejs
```

**Import (src/renderer/index.js):**
```javascript
import Alpine from 'alpinejs';
window.Alpine = Alpine;
Alpine.start();
```

**HTML change:** Remove CDN script tag from index.html

---

## Build Configuration

### esbuild.js

**NEW file - Build script:**
```javascript
const esbuild = require('esbuild');
const fs = require('fs').promises;
const path = require('path');

async function build() {
  // Bundle renderer
  await esbuild.build({
    entryPoints: ['src/renderer/index.js'],
    outfile: 'dist/renderer.js',
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    sourcemap: true,
    minify: false
  });

  // Copy static assets
  await fs.mkdir('dist', { recursive: true });
  await fs.copyFile('src/renderer/index.html', 'dist/index.html');
  await fs.copyFile('src/renderer/styles.css', 'dist/styles.css');

  console.log('Build complete');
}

build().catch(() => process.exit(1));
```

**Features:**
- Single renderer bundle
- Source maps for debugging
- Not minified (readability during development)
- Copies HTML/CSS to dist/

**Watch mode (future):** Can add `watch: process.argv.includes('--watch')` to esbuild options

---

## Package.json Changes

**MODIFIED sections:**

### Dependencies
```json
{
  "dependencies": {
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/xterm": "^5.5.0",
    "alpinejs": "^3.14.1",  // NEW
    "dayjs": "^1.11.19",
    "marked": "^12.0.0",
    "node-pty": "^1.0.0"
  },
  "devDependencies": {
    "@electron/rebuild": "^3.7.2",
    "@playwright/test": "^1.56.1",
    "@vitest/coverage-v8": "^4.0.8",
    "esbuild": "^0.24.0",  // NEW
    "electron": "^39.1.1",
    "happy-dom": "^20.0.10",
    "vitest": "^3.2.4"
  }
}
```

### Main Entry
```json
{
  "main": "src/main.js"  // CHANGED from "main.js"
}
```

### Scripts
```json
{
  "scripts": {
    "build": "node esbuild.js",  // NEW
    "start": "npm run build && electron .",  // CHANGED: build before start
    "test": "npm run build && playwright test",  // CHANGED: build before test
    "test:unit": "vitest run",  // UNCHANGED
    "test:unit:watch": "vitest",  // UNCHANGED
    "test:coverage": "vitest run --coverage",  // UNCHANGED
    "test:all": "npm run test:unit && npm test"  // UNCHANGED
  }
}
```

---

## HTML Changes

### src/renderer/index.html

**Remove individual script tags:**
```html
<!-- DELETE THESE -->
<script src="lib/split-pane.js"></script>
<script src="lib/tabs.js"></script>
<script src="lib/terminals.js"></script>
<script src="lib/projects.js"></script>
<script src="lib/markdown.js"></script>
<script src="lib/themes.js"></script>
<script src="lib/app.js"></script>
```

**Remove Alpine CDN:**
```html
<!-- DELETE THIS -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

**Add bundled renderer:**
```html
<script src="renderer.js"></script>
```

**Update stylesheet path:**
```html
<link rel="stylesheet" href="styles.css" />
```

**xterm.css path:** Needs updating - either bundle or copy node_modules to dist

---

## Main Process Changes

**src/main.js:** Only path change

```javascript
// OLD
mainWindow.loadFile('index.html');

// NEW
mainWindow.loadFile('dist/index.html');
```

**All other main process code unchanged** - IPC handlers, terminal management, etc. remain identical.

---

## Entry Point Implementation

**NEW file - src/renderer/index.js:**

```javascript
import Alpine from 'alpinejs';
import { createSplitPane } from './split-pane.js';
import { createTabs } from './tabs.js';
import { createTerminals } from './terminals.js';
import { createProjects } from './projects.js';
import { createMarkdown } from './markdown.js';
import { createThemes } from './themes.js';

// Make Alpine globally available for x-data in HTML
window.Alpine = Alpine;

// Initialize Alpine data component
Alpine.data('splitPane', () => {
  const splitPane = createSplitPane();
  const tabs = createTabs();
  const terminals = createTerminals();
  const projects = createProjects();
  const markdown = createMarkdown();
  const themes = createThemes();

  return {
    ...splitPane,
    ...tabs,
    ...terminals,
    ...projects,
    ...markdown,
    ...themes,

    init() {
      this.initSplitPosition();
      this.initTheme();
      this.loadProjects();
    }
  };
});

// Initialize default terminal (moved from app.js)
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Wait for Alpine to be ready
  document.addEventListener('alpine:initialized', () => {
    // Get terminal CWD and initialize default terminal
    ipcRenderer.invoke('get-terminal-cwd').then(({ cwd }) => {
      console.log('Terminal CWD:', cwd);
    });
  });
});

// Start Alpine
Alpine.start();
```

**Note:** Preserves exact behavior of current lib/app.js but in ESM format.

---

## Migration Steps

1. **Install dependencies:**
   ```bash
   npm install alpinejs esbuild
   ```

2. **Create src/ structure:**
   - Create src/main.js (move main.js)
   - Create src/renderer/ directory
   - Move lib/*.js to src/renderer/*.js
   - Move index.html to src/renderer/index.html
   - Move styles.css to src/renderer/styles.css

3. **Convert modules to ESM:**
   - Remove IIFE wrappers from all src/renderer/*.js files
   - Change `global.HegelIDE.createFoo = createFoo` to `export function createFoo`
   - Create src/renderer/index.js entry point with imports

4. **Update HTML:**
   - Remove individual script tags and Alpine CDN
   - Add single `<script src="renderer.js"></script>`
   - Update stylesheet path

5. **Create build script:**
   - Create esbuild.js with renderer bundling + asset copying

6. **Update package.json:**
   - Add alpinejs and esbuild to dependencies/devDependencies
   - Change "main" to "src/main.js"
   - Update scripts to run build before start/test

7. **Update main.js:**
   - Change loadFile path to 'dist/index.html'

8. **Add dist/ to .gitignore**

9. **Build and verify:**
   ```bash
   npm run build
   npm start
   ```

---

## Test Scenarios

### Simple: Basic Build
- Run `npm run build`
- Verify dist/renderer.js created
- Verify dist/index.html and dist/styles.css copied
- File sizes reasonable (renderer.js ~100-200KB with Alpine bundled)

### Complex: Application Functionality
- Run `npm start` (should build then launch)
- Verify IDE launches without errors
- Verify all tabs work (Projects, Settings, terminal tabs)
- Verify terminals can be created and receive input/output
- Verify project discovery works (hegel pm discover list)
- Verify markdown rendering works
- Verify theme switching works
- Verify split pane dragging works

### Error: Missing Dependencies
- Delete node_modules/alpinejs
- Run `npm run build`
- Should fail with clear error about missing alpinejs module

### Integration: Testing Pipeline
- Run `npm test` (Playwright e2e)
- All existing tests should pass with bundled code
- Run `npm run test:unit` (Vitest)
- Unit tests should pass (may need path updates if they import from lib/)

---

## Success Criteria

- Build succeeds: `npm run build` completes without errors
- Application launches: `npm start` opens Hegel IDE window
- All existing functionality works: terminals, projects, markdown, themes, split pane
- Bundle size reasonable: dist/renderer.js under 500KB
- Tests pass: `npm run test:all` succeeds
- No console errors in DevTools when running app
- Alpine.js loaded from bundle, not CDN (check Network tab)
- Source maps work: can debug original .js files in DevTools

---

## Out of Scope

**Deferred to future work:**
- TypeScript migration (.ts files, type checking)
- Security hardening (contextIsolation, preload script)
- Code reorganization (components/ subdirectories, etc.)
- Hot reload / watch mode during development
- Minification / production optimizations
- CSS bundling (keep separate for now)
- Unit test infrastructure changes (just update paths if needed)
- Main process bundling (stays as raw Node.js)

**Explicitly not changing:**
- Main process architecture (IPC handlers, pty management)
- Alpine.js usage patterns in HTML templates
- CSS structure or theming system
- Terminal or project management logic
- Test assertions or test structure (beyond path updates)

---

## Notes

**Why bundle Alpine.js?** Eliminates external runtime dependency, ensures consistent version, enables offline usage.

**Why not bundle main process?** Main process is Node.js code, doesn't need bundling. Electron already handles it efficiently.

**Why dist/ not build/?** Common convention (Vite, Webpack, etc.), clear separation from src/, easier to gitignore.

**xterm.css handling:** TBD - either copy from node_modules to dist/ in build script, or bundle CSS with esbuild plugin.

**Backward compatibility:** Old lib/ files can be deleted after verifying bundled version works. Keep temporarily during migration for safety.
