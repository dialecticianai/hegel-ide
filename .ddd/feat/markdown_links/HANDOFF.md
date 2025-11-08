# Markdown Link Navigation - Test Debugging Handoff

## What We Built

Implemented markdown link navigation feature that allows clicking links in rendered markdown to:
- Regular click: Navigate current tab (close old tab, open new file tab at same position)
- Cmd/Ctrl+Click: Open link in new tab (preserve current tab)
- Deduplication: Same file can only be open once
- External links: Pass through without interception

**Implementation files:**
- `renderer.js:336-416` - `handleMarkdownClick()`, `openFileTab()`, `fetchFileContent()`, `getFileContent()`
- `index.html:95,115` - `@click="handleMarkdownClick($event, tab.id, tab.projectName)"` on `.markdown-content` divs
- Added `fileContents` cache: `fileContents[projectName:filePath]` stores `{content, loading, error}`

**Feature works manually** - confirmed by user during development.

## Test Suite Created

**Fixtures:** `e2e/fixtures/markdown-links/` with `index.md`, `page-a.md`, `page-b.md`, `page-c.md`

**Test approach:**
- Inject all fixtures into `fileContents` cache upfront
- Create file tabs programmatically
- Click links and assert tab state changes

**Tests:** `e2e/markdown-links.spec.js` - 6 tests covering all scenarios from SPEC.md

## The Problem

**ALL tests fail** with same symptom: clicking markdown links causes navigation to `chrome-error://chromewebdata/` instead of being intercepted by `handleMarkdownClick`.

**Evidence:**
- URL after click: `chrome-error://chromewebdata/`
- Alpine becomes undefined after click (page destroyed)
- No JavaScript runs - navigation happens immediately

## Root Cause Analysis

### Discovery Process

1. **Initial hypothesis:** Links not rendered
   - **FALSE** - Links render correctly, `linkCount = 1`

2. **Second hypothesis:** `@click` attribute missing
   - **FALSE** - Attribute present: `@click="handleMarkdownClick($event, tab.id, tab.projectName)"`

3. **Third hypothesis:** Scope isolation issue
   - **TRUE** - Found nested `x-data` scope:
   ```html
   <div x-data="{ get fileKey() { return `${tab.projectName}:${tab.filePath}`; } }">
     <div class="markdown-content" @click="handleMarkdownClick(...)">
   ```
   - Child scope doesn't inherit `handleMarkdownClick` from parent splitPane component
   - Verified: `Alpine.$data(markdownDiv).handleMarkdownClick === undefined`

### Fix Attempted

**Changed:** `index.html:106-121` - Removed nested `x-data`, inline the fileKey expression:
```html
<!-- Before -->
<div x-data="{ get fileKey() { return `${tab.projectName}:${tab.filePath}`; } }">
  <template x-if="fileContents[fileKey]">

<!-- After -->
<div x-show="activeLeftTab === tab.id">
  <template x-if="fileContents[`${tab.projectName}:${tab.filePath}`]">
```

**Result:** Tests still fail with same chrome-error navigation

**Verification:**
- New HTML loaded: `parentHasXData: false` confirms no nested scope
- `@click` still present in rendered HTML
- But clicks still cause navigation instead of being intercepted

## Current State

**Git status:** Uncommitted changes in 4 files (renderer.js, index.html, test files)

**Implementation:** Complete and working manually

**Tests:**
- All 6 tests in `e2e/markdown-links.spec.js` fail
- Debug test `e2e/markdown-links-debug.spec.js` reproduces issue
- Minimal repro `e2e/markdown-links-minimal.spec.js` shows Alpine has data but click handler doesn't fire

**Hegel workflow:** `execution spec->plan->[code]` (code phase incomplete - tests not passing)

## Next Steps

### Option 1: Fix Alpine Event Binding Issue

The `@click` attribute is in the HTML but Alpine isn't attaching the event listener. Possible causes:

1. **Template string syntax in Alpine:** The inline expression `fileContents[\`${tab.projectName}:${tab.filePath}\`]` might not work in Alpine's `x-if`. Test if Alpine evaluates template literals correctly.

2. **Event binding timing:** When content is injected via `x-html`, Alpine might not re-bind events. Try using `$nextTick` or `Alpine.nextTick()` after injecting fixtures.

3. **x-html isolation:** Content inside `x-html` doesn't get Alpine directives. The click event on the parent div should bubble up from child `<a>` tags, but maybe Electron/Chrome is capturing it first.

### Option 2: Alternative Test Approach

Instead of programmatic fixture injection:

1. **Use real files:** Put test fixtures in a real project directory that `get-project-file` IPC can read
2. **Mock IPC layer:** Intercept `get-project-file` IPC calls in tests and return fixture content
3. **Test in loaded project:** Open actual hegel-ide project README and test navigation there

### Option 3: Manual Testing Only

If e2e tests are too brittle:

1. Document manual test procedure in `e2e/markdown-links/MANUAL_TEST.md`
2. Create visual test checklist for QA
3. Add integration test that verifies `handleMarkdownClick` function logic in isolation

## Key Files

**Implementation:**
- `renderer.js` - Alpine component with click handler
- `index.html:104-121` - File tab template
- `e2e/fixtures/markdown-links/` - Test fixtures

**Debug artifacts:**
- `e2e/markdown-links-debug.spec.js` - Original debug test
- `e2e/markdown-links-minimal.spec.js` - Minimal repro (most useful)
- Console logs show scope state, HTML structure, click events

**Workflow docs:**
- `.ddd/feat/markdown_links/SPEC.md` - Feature spec
- `.ddd/feat/markdown_links/PLAN.md` - Implementation plan

## Questions for Next Session

1. Does Alpine support template literal syntax in expressions like `x-if="fileContents[\`${var}\`]"`?
2. Can we verify `handleMarkdownClick` is actually bound by adding `console.log` in renderer.js and manually clicking?
3. Should we try `@click.prevent` instead of `event.preventDefault()` inside handler?
4. Is there an Alpine dev tool to inspect event listeners?
5. What's the difference between test environment and manual testing that makes it work manually?
