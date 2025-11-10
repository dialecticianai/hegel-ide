# Toy 3: Markdown Line-Tracking Renderer Specification

Render markdown with block-level line number tracking for selection-to-comment mapping.

---

## Overview

**What it does**: Standalone HTML page that renders markdown content with each block element (paragraph, heading, code block, list, table) wrapped in a container with `data-line-start` and `data-line-end` attributes indicating source line ranges.

**Key principles**:
- Use marked.js lexer to extract token line positions
- Wrap block-level elements with line tracking metadata
- Preserve standard markdown rendering output (headings, code blocks, lists, tables)
- Enable DOM queries by line range for comment alignment
- No Electron - just HTML + Alpine.js + marked.js

**Scope**:
- Custom marked renderer that tracks line numbers
- Sample markdown file with diverse block types
- HTML page displaying rendered output with line attributes
- Playwright tests validating line tracking accuracy
- Manual inspection capability (open HTML in browser, inspect DOM)

**Integration context**:
- Foundation for review tab comment margin alignment (`.ddd/feat/markdown-review/`)
- Line ranges will map selected text blocks to comment positions
- Output structure feeds into grid layout renderer (future integration)

---

## Data Model

### Input: Markdown Source

Sample markdown file with known line positions:

```markdown
# Heading One

This is a paragraph spanning
multiple lines in the source.

## Heading Two

- List item one
- List item two
- List item three

```javascript
function example() {
  return 42;
}
```

Another paragraph.
```

### Output: Rendered Block Structure

Each markdown block wrapped in container with line metadata:

```html
<div class="markdown-block" data-line-start="1" data-line-end="1" data-type="heading">
  <h1>Heading One</h1>
</div>

<div class="markdown-block" data-line-start="3" data-line-end="4" data-type="paragraph">
  <p>This is a paragraph spanning multiple lines in the source.</p>
</div>

<div class="markdown-block" data-line-start="6" data-line-end="6" data-type="heading">
  <h2>Heading Two</h2>
</div>

<div class="markdown-block" data-line-start="8" data-line-end="10" data-type="list">
  <ul>
    <li>List item one</li>
    <li>List item two</li>
    <li>List item three</li>
  </ul>
</div>

<div class="markdown-block" data-line-start="12" data-line-end="15" data-type="code">
  <pre><code class="language-javascript">function example() {
  return 42;
}</code></pre>
</div>

<div class="markdown-block" data-line-start="17" data-line-end="17" data-type="paragraph">
  <p>Another paragraph.</p>
</div>
```

**Attributes**:
- `data-line-start`: First line number of block in source (1-indexed)
- `data-line-end`: Last line number of block in source (1-indexed, inclusive)
- `data-type`: Block type (`paragraph`, `heading`, `code`, `list`, `table`, `blockquote`, `hr`)
- `class="markdown-block"`: Common class for all tracked blocks

### JavaScript Data Structure

Intermediate representation (used for testing):

```javascript
[
  {
    type: 'heading',
    lineStart: 1,
    lineEnd: 1,
    html: '<h1>Heading One</h1>'
  },
  {
    type: 'paragraph',
    lineStart: 3,
    lineEnd: 4,
    html: '<p>This is a paragraph spanning multiple lines in the source.</p>'
  },
  // ... more blocks
]
```

---

## Core Operations

### Operation: Parse Markdown with Line Tracking

**Behavior**:
- Read markdown source as string
- Use `marked.lexer()` to tokenize and extract line positions
- For each block-level token, extract `token.raw` line count
- Render token to HTML using `marked.parser()` or custom renderer
- Wrap rendered HTML in container div with line attributes
- Return array of block objects or concatenated HTML string

**Parameters**:
- `markdown` (string): Source markdown content
- `outputFormat` (string): `'array'` for structured data or `'html'` for concatenated string

**Example**:

```javascript
const markdown = `# Title\n\nParagraph text.`;

const blocks = parseMarkdownWithLines(markdown, 'array');
// Returns:
// [
//   { type: 'heading', lineStart: 1, lineEnd: 1, html: '<h1>Title</h1>' },
//   { type: 'paragraph', lineStart: 3, lineEnd: 3, html: '<p>Paragraph text.</p>' }
// ]

const html = parseMarkdownWithLines(markdown, 'html');
// Returns concatenated HTML string with wrapper divs
```

**Validation**:
- Line numbers must be sequential (no gaps or overlaps)
- Line numbers must be positive integers
- Each block must have `lineStart <= lineEnd`
- Block types must match marked token types

---

### Operation: Render to HTML Page

**Behavior**:
- Load markdown source file
- Parse with line tracking
- Inject rendered HTML into Alpine.js component
- Display in browser with inspectable DOM

**Example Usage**:

```bash
# Open index.html in browser (file:// protocol)
open index.html

# Or serve via local server
python3 -m http.server 8000
# Visit http://localhost:8000/index.html
```

**Validation**:
- All blocks render visibly
- Data attributes present on all `.markdown-block` elements
- Line numbers match source file
- Standard markdown features work (bold, italic, links, code highlighting)

---

## Test Scenarios

### Simple: Single Paragraph

**Input**:
```markdown
This is a test.
```

**Expected Output**:
```javascript
[
  {
    type: 'paragraph',
    lineStart: 1,
    lineEnd: 1,
    html: '<p>This is a test.</p>'
  }
]
```

**Test**:
- Parse single-line markdown
- Verify single block returned
- Verify line numbers are both 1
- Verify HTML contains `<p>` tag

---

### Complex: Multi-Block Document

**Input**: Sample markdown file with:
- 2 headings (h1, h2)
- 3 paragraphs (including multi-line)
- 1 code block
- 1 unordered list
- 1 ordered list
- 1 blockquote

**Expected Behavior**:
- Each block gets unique wrapper div
- Line numbers are sequential and non-overlapping
- Multi-line paragraphs have correct start/end range
- Lists treated as single block (not per-item)
- Code blocks preserve language class

**Test**:
- Load sample file
- Parse with line tracking
- Query DOM for all `.markdown-block` elements
- Verify count matches expected block count
- Verify no line number gaps or overlaps
- Verify each type has correct data-type attribute

---

### Error: Empty Markdown

**Input**: Empty string or only whitespace

**Expected Behavior**:
- Returns empty array or empty string (depending on output format)
- No errors thrown
- No DOM elements with markdown-block class

**Test**:
- Call parser with empty string
- Verify empty result
- Verify no exceptions

---

### Integration: Selection Detection

**Behavior**: Simulate text selection within a rendered block and verify line range extraction.

**Test**:
- Render sample markdown to DOM
- Use Playwright to select text within a paragraph
- Walk DOM to find containing `.markdown-block` element
- Extract `data-line-start` and `data-line-end` attributes
- Verify extracted range matches expected source lines

**Example**:
```javascript
// User selects text in paragraph at lines 5-7
const selection = window.getSelection();
const block = selection.anchorNode.closest('.markdown-block');
const lineStart = parseInt(block.dataset.lineStart, 10); // 5
const lineEnd = parseInt(block.dataset.lineEnd, 10);     // 7
```

---

## Success Criteria

Agent-verifiable:
- Playwright tests pass: `npm test` (scoped to toy directory)
- Sample markdown file renders with all block types
- All `.markdown-block` elements have `data-line-start`, `data-line-end`, `data-type` attributes
- Line numbers are sequential (no gaps between blocks)
- Line numbers match source file line positions (manually verified against fixture)
- Multi-line blocks have `lineEnd > lineStart`
- Single-line blocks have `lineStart === lineEnd`
- Block types match markdown syntax (`heading`, `paragraph`, `code`, `list`, etc.)
- Selection detection test extracts correct line range from DOM

Optional Human Testing:
- Visual inspection: open `index.html` in browser
- DevTools inspection: verify data attributes on all blocks
- Line numbers match source when comparing side-by-side
- Rendered markdown looks correct (formatting, syntax highlighting)

---

## Out of Scope

**Deferred to main feature implementation**:
- Inline-level tracking (bold, italic, links within paragraphs)
- Character-level precision (only block-level granularity)
- Grid layout integration (this toy just renders linear HTML)
- Comment margin rendering (handled in review tab feature)
- Alpine.js state management beyond basic display
- IPC communication (no Electron in toy)
- File picker or dynamic loading (static sample file only)
- Table of contents or anchor link generation
- Performance optimization for large documents
- Custom marked extensions or plugins
- Syntax highlighting for code blocks (use marked defaults)

---

## Dependencies

**Existing** (already in main project):
- `marked` (v12.0.2) - Markdown parsing and rendering
- `alpinejs` - Reactive framework for display
- `@playwright/test` - E2E testing

**New** (none required):
- Toy uses existing dependencies from main project

**File structure**:
```
.ddd/toys/toy3_markdown_line_tracking/
├── SPEC.md          # This file
├── PLAN.md          # To be written (TDD implementation steps)
├── LEARNINGS.md     # To be written (insights from implementation)
├── index.html       # HTML page with Alpine.js + marked.js
├── renderer.js      # Line-tracking parser implementation
├── sample.md        # Test markdown file with diverse blocks
├── package.json     # Dependencies and test script (optional, may use main project)
└── test/
    └── line-tracking.test.js  # Playwright E2E tests
```

---

## Notes

**Why this toy matters**:
- Previous attempt in Electron proved complex due to IPC, Alpine integration, and DOM diffing
- Isolating line tracking logic enables focused testing without Electron overhead
- Validates marked.js API usage before committing to architecture
- Provides clean reference implementation for main feature

**Key technical question to answer**:
- How does marked.js expose line number information for tokens?
- Can we reliably map tokens back to source line ranges?
- Do multi-line blocks (paragraphs, lists) expose start/end lines?

**Testing strategy**:
- Playwright tests query rendered DOM (no implementation detail testing)
- Verify observable behavior: data attributes match source lines
- Test selection detection pattern (foundation for comment UX)
