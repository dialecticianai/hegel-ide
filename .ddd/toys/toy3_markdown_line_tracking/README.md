# toy3_markdown_line_tracking

Block-level line tracking for markdown documents using marked.js lexer API.

## Purpose

Renders markdown with each block element (paragraph, heading, code, list, etc.) wrapped in a container with `data-line-start` and `data-line-end` attributes indicating source line ranges. Enables selection-to-comment mapping for review tab feature by providing DOM query targets aligned to source code positions.

## Key API

```javascript
parseMarkdownWithLines(markdown, 'html') -> wrapped HTML string
parseMarkdownWithLines(markdown, 'array') -> [{type, lineStart, lineEnd, html}]
findMarkdownBlock(domNode) -> {lineStart, lineEnd, blockType, element} | null
```

## Core Concepts

- **Token.raw extraction**: marked.lexer exposes line positions via raw content including newlines
- **Trailing newline trimming**: Separate content newlines from whitespace for accurate line ranges
- **Space token skipping**: Advance line counter without rendering blank lines
- **DOM traversal**: Walk up from selection node to find containing .markdown-block element
- **Data attributes**: lineStart/lineEnd/type exposed for grid layout alignment

## Gotchas

- **File protocol limitation**: ES modules don't work with file:// - use regular scripts
- **Marked includes blank lines**: token.raw contains trailing newlines after content
- **Block-level only**: No inline tracking (bold/italic) within paragraphs
- **List granularity**: Entire list is single block, not per-item
- **Untested at scale**: Sample only 28 lines, 10 blocks

## Quick Test

`npx playwright test test/line-tracking.test.js`
