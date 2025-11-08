# lib/

Frontend modules for Alpine.js component composition. Each module focuses on a single concern, loaded via script tags with IIFE pattern using HegelIDE global namespace.

## Structure

```
lib/
├── split-pane.js    Split pane drag handlers and localStorage persistence
├── tabs.js          Tab management for left and right panels
├── terminals.js     Terminal creation, initialization, and IPC handling
├── projects.js      Project discovery, details fetching, file operations
├── markdown.js      Markdown rendering and dev tools utilities
└── app.js           Main Alpine component composition (loads after all modules)
```

## Loading Order

Scripts must load in dependency order (defined in index.html):
1. split-pane.js
2. tabs.js
3. terminals.js
4. projects.js
5. markdown.js
6. app.js (composes all modules into Alpine component)

## Pattern

Each module uses IIFE to expose functions to `window.HegelIDE` namespace:

```javascript
(function(global) {
  'use strict';

  function createModuleName() {
    return { /* state and methods */ };
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createModuleName = createModuleName;
})(window);
```

app.js merges all modules using object spread into single Alpine component.
