# Tab System

Hegel IDE uses a dual-pane tab system for managing different views and content.

---

## Architecture

**Two independent panes:**
- **Left pane** (`leftTabs`): Projects, project details, file views, settings
- **Right pane** (`rightTabs`): Terminal tabs

Each pane maintains its own:
- Tab array (`leftTabs` / `rightTabs`)
- Active tab ID (`activeLeftTab` / `activeRightTab`)
- Tab operations (add, close, switch)

---

## Tab Types

### Left Pane

**`type: 'projects'`** (non-closeable, always at index 0)
```javascript
{
  id: 'projects',
  type: 'projects',
  label: 'Projects',
  closeable: false
}
```
Shows discovered hegel projects with metrics and controls.

**`type: 'settings'`** (closeable, always at index 1 when open)
```javascript
{
  id: 'settings',
  type: 'settings',
  label: 'Settings',
  closeable: true
}
```
Application settings (theme, dev tools). Deduplicates - clicking ⚙️ when open switches to existing tab rather than creating duplicate.

**`type: 'project-detail'`** (closeable)
```javascript
{
  id: 'project-<name>',
  type: 'project-detail',
  label: '<project-name>',
  closeable: true,
  projectName: '<name>'
}
```
Shows project overview card, README, markdown tree, and metrics. One tab per project, deduplicates on open.

**`type: 'file'`** (closeable)
```javascript
{
  id: 'file-<absolute-path-sanitized>',
  type: 'file',
  label: '<filename>',
  closeable: true,
  filePath: '/absolute/path/to/file.md'
}
```
Displays markdown file content. Uses absolute file paths. Supports both project files (opened via markdown tree) and standalone files (programmatic API).

### Right Pane

**`type: 'terminal'`** (closeable, except when it's the last terminal)
```javascript
{
  id: 'term-<n>',
  type: 'terminal',
  label: 'Terminal <n>',
  closeable: true,
  terminalId: 'term-<n>'
}
```
PTY-backed terminal instances. Terminal 1 created at app launch. Add button creates sequential terminals (term-2, term-3, etc.).

---

## File Content Management

**Content storage:** `fileContents` object keyed by absolute file path
```javascript
fileContents['/absolute/path/to/file.md'] = {
  content: '# Markdown content...',
  loading: false,
  error: null
}
```

**Loading flow:**
1. `openFileTab(absolutePath)` creates tab, checks cache
2. If not cached: `fetchFileContent(absolutePath)` → `fetchAbsoluteFile(absolutePath)`
3. `fetchAbsoluteFile` invokes `get-file-content` IPC handler
4. Main process reads file, returns `{ content }` or `{ error }`
5. Content stored in cache, tab displays rendered markdown

**Deduplication:** Opening same file path switches to existing tab rather than creating duplicate.

---

## Markdown Rendering

**Image path resolution:**
```javascript
renderMarkdown(content, absoluteFilePath)
```
Transforms relative image paths to `file://` URLs resolved from file's directory.

Example:
- File: `/path/to/project/docs/SPEC.md`
- Image: `<img src="diagram.png">`
- Resolved: `file:///path/to/project/docs/diagram.png`

**Link navigation:**
```javascript
handleMarkdownClick(event, tabId)
```
- Resolves relative `.md` links from current file's directory
- Regular click: Navigate (replace current tab)
- Cmd/Ctrl+Click: Open in new tab
- External links (http://, https://): Open in system browser

---

## Tab Operations

### Opening Tabs

**Project detail:**
```javascript
this.openProjectTab(projectName)
```
Creates or switches to project-detail tab.

**File:**
```javascript
this.openFileTab(absoluteFilePath, hash)
```
Creates or switches to file tab. Optional `hash` for anchor navigation.

**Settings:**
```javascript
this.openSettingsTab()
```
Creates or switches to settings tab at index 1.

**Terminal:**
```javascript
// Add terminal button calls internally:
await ipcRenderer.invoke('create-terminal', { terminalId })
```
Creates new PTY and terminal tab.

### Closing Tabs

```javascript
this.closeLeftTab(tabId)
this.closeRightTab(tabId)
```
- Removes tab from array
- If active tab closed, switches to adjacent tab
- Project detail tabs: Switch to Projects tab
- Last terminal: Show "Open Terminal" button instead

### Switching Tabs

```javascript
this.switchLeftTab(tabId)
this.switchRightTab(tabId)
```
Sets active tab ID, triggers content rendering.

---

## Tab Position Rules

**Projects tab:** Always index 0, non-closeable

**Settings tab:** Always index 1 when open (even if other tabs exist)
```javascript
// Insert at index 1, pushing other tabs right
this.leftTabs.splice(1, 0, newTab);
```

**Other tabs:** Append to end of array, or insert at specific index for navigation replacement

**Auto-open:** hegel-ide project auto-opens at startup if terminal cwd matches project path

---

## IPC Handlers

**`get-file-content`** - Read file from absolute path
```javascript
{ filePath: '/absolute/path' } → { content } or { error }
```

**`get-project-file`** - Read file from project (legacy, for project-detail README)
```javascript
{ projectPath, fileName } → { content } or { error }
```

**`create-terminal`** - Spawn new PTY
```javascript
{ terminalId } → { success: true }
```

**`close-terminal`** - Kill PTY
```javascript
{ terminalId } → { success: true }
```

---

## Testing Patterns

**Creating tabs programmatically (E2E tests):**
```javascript
await mainWindow.evaluate(({ filePath, content }) => {
  const alpineData = Alpine.$data(document.getElementById('app'));

  // Store content
  alpineData.fileContents[filePath] = {
    content: content,
    loading: false,
    error: null
  };

  // Create tab
  const tabId = `file-${filePath.replace(/\//g, '-')}`;
  alpineData.leftTabs.push({
    id: tabId,
    type: 'file',
    label: 'test-file',
    closeable: true,
    filePath: filePath
  });

  alpineData.switchLeftTab(tabId);
}, { filePath, content });
```

**Verifying tab structure:**
```javascript
const tabData = await mainWindow.evaluate(({ filePath }) => {
  const alpineData = Alpine.$data(document.getElementById('app'));
  const tabId = `file-${filePath.replace(/\//g, '-')}`;
  return alpineData.leftTabs.find(t => t.id === tabId);
}, { filePath });

expect(tabData.type).toBe('file');
expect(tabData.filePath).toBe(expectedAbsolutePath);
```

---

## Migration Notes

**Breaking change (Step 1):** File tabs migrated from project-scoped to absolute paths.

**Old pattern (deprecated):**
```javascript
{
  id: `file-${projectName}-${relativeFilePath}`,
  type: 'file',
  projectName: projectName,
  filePath: relativeFilePath  // relative to project
}
fileContents[`${projectName}:${relativeFilePath}`]
```

**New pattern:**
```javascript
{
  id: `file-${absolutePath.replace(/\//g, '-')}`,
  type: 'file',
  filePath: absolutePath  // absolute
}
fileContents[absolutePath]
```

**Why:** Enables standalone file support (not tied to projects), simplifies architecture, prepares for review tab.
