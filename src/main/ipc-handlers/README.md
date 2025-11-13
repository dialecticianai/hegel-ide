# src/main/ipc-handlers/

IPC handlers organized by domain (projects, terminals, files, reviews, utilities).

## Structure

```
ipc-handlers/
├── projects.js         Project discovery, details, removal, refresh, markdown tree
├── terminals.js        Terminal input/output routing, terminal creation/close
├── files.js            File reading (project-relative and absolute paths)
├── reviews.js          Review comment submission via hegel review command
└── utils.js            DevTools toggle, terminal CWD, HTTP port retrieval
```

## Handler Responsibilities

**projects.js**: Handles all project-related IPC (get-projects, get-project-details, remove-project, refresh-project, refresh-all-projects, get-markdown-tree)

**terminals.js**: Routes terminal I/O, handles terminal creation and close events

**files.js**: Reads files from disk (get-project-file for relative paths, get-file-content for absolute paths)

**reviews.js**: Converts review comments to JSONL and submits via hegel review command

**utils.js**: Utility handlers for devtools, terminal CWD, and HTTP port queries
