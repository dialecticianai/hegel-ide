# Markdown Line-Tracking Renderer: Learnings

## Implementation Success

**Status**: ✅ Complete - All 11 Playwright tests passing

**Key Achievement**: Successfully implemented block-level line tracking for markdown using marked.js lexer API.

---

## Technical Insights

### 1. Marked.js Token Structure

**Discovery**: `marked.lexer()` exposes line information through `token.raw` property.

**Pattern**:
```javascript
const tokens = marked.lexer(markdown);
tokens.forEach(token => {
  console.log(token.type, token.raw);
});
```

**Key Insight**: `token.raw` includes:
- The actual content
- Newlines within multi-line blocks
- **Trailing blank lines after the block**

This trailing whitespace was crucial to handle correctly.

---

### 2. Line Number Calculation

**Challenge**: Marked includes trailing newlines in `token.raw`, making naive newline counting inaccurate.

**Solution**: Separate content newlines from trailing whitespace newlines.

**Formula**:
```javascript
const totalNewlines = (token.raw.match(/\n/g) || []).length;
const trimmedRaw = token.raw.trimEnd();
const contentNewlines = (trimmedRaw.match(/\n/g) || []).length;

lineEnd = lineStart + contentNewlines;
currentLine = lineStart + totalNewlines;  // Advance past whitespace
```

**Example**:
```
Token: "# Heading\n\n"
totalNewlines: 2
contentNewlines: 0
lineStart: 1
lineEnd: 1 (heading occupies only line 1)
currentLine advances to: 3 (past the blank line)
```

---

### 3. Space Token Handling

**Discovery**: Marked generates `type: 'space'` tokens for blank lines between blocks.

**Handling**: Skip rendering but advance line counter to maintain sequential numbering.

```javascript
if (token.type === 'space') {
  currentLine = lineStart + totalNewlines;
  continue;  // Don't push to blocks array
}
```

---

### 4. Block-Level Granularity Sufficiency

**Finding**: Block-level tracking (paragraphs, headings, code blocks) provides sufficient granularity for comment alignment.

**Trade-off**: No inline-level tracking (bold, italic, links within paragraphs) needed for review use case.

**Benefit**: Simpler implementation, cleaner DOM structure, easier selection detection.

---

### 5. File Protocol Limitations

**Challenge**: ES modules don't work with `file://` protocol in browsers (CORS restriction).

**Initial Approach**: `fetch('./sample.md')` fails with `file://` URLs.

**Solution**:
1. Convert renderer.js to regular script (not module)
2. Inline sample markdown as string constant
3. Remove `export` keywords, expose functions via `window.` global

**Alternative** (not used): Serve via local HTTP server (`python3 -m http.server`).

---

### 6. Selection Detection Pattern

**Approach**: Walk up DOM from selection anchor node to find containing `.markdown-block` element.

**Implementation**:
```javascript
function findMarkdownBlock(node) {
  let current = node;
  while (current && current !== document.body) {
    if (current.classList?.contains('markdown-block')) {
      return {
        lineStart: parseInt(current.dataset.lineStart, 10),
        lineEnd: parseInt(current.dataset.lineEnd, 10),
        blockType: current.dataset.type
      };
    }
    current = current.parentElement;
  }
  return null;
}
```

**Benefit**: Works regardless of selection depth (text node, span, code element).

---

### 7. Testing Strategy

**E2E Focus**: Playwright tests query rendered DOM, not internal implementation.

**Test Categories**:
1. **Rendering**: Verify blocks have correct line attributes
2. **Multi-block**: Validate sequential numbering across diverse content
3. **Selection**: Confirm line range extraction from DOM
4. **Edge cases**: Empty, whitespace, single-line, consecutive blanks

**Coverage**: 11 tests validating observable behavior.

**Speed**: Full suite runs in ~4.6 seconds.

---

## Integration Recommendations

### For Main Feature (.ddd/feat/markdown-review/)

**1. Renderer Integration**:
- Copy `parseMarkdownWithLines()` to `src/renderer/markdown.js`
- Add optional `lineTracking` parameter to `renderMarkdown()` function
- Preserve backward compatibility for existing file tabs

**2. Alpine.js State Management**:
- Store parsed blocks in Alpine component state
- Use `x-for` to iterate blocks for grid layout rendering
- Bind margin comment cards to block line ranges

**3. IPC Integration**:
- Renderer calls `parseMarkdownWithLines()` when opening review tab
- Main process doesn't need to know about line tracking (renderer-only concern)
- Comment submission passes line ranges to hegel CLI via IPC

**4. Grid Layout**:
- CSS Grid with `grid-template-rows` auto-generated per block
- Each block gets its own row
- Comment margin cells align to same rows
- DOM handles scrolling alignment automatically

---

## Marked.js API Quirks

**1. Code Block Token Structure**:
- Fenced code blocks (```` ```javascript````) span multiple lines
- Token includes opening fence, code content, and closing fence
- Line tracking works correctly because we count newlines in `token.raw`

**2. List Token Behavior**:
- Entire list (all items) represented as single token
- No per-item granularity
- Good for block-level tracking (entire list gets one comment)

**3. Blockquote Token**:
- Multi-line blockquotes are single token
- Token.raw includes `>` prefix markers
- Content newlines counted correctly

---

## Limitations and Future Work

**What Works**:
- Block-level line tracking for all common markdown elements
- Accurate line ranges matching source file
- Selection detection for comment mapping
- Edge case handling (empty, whitespace, blanks)

**Out of Scope** (deferred):
- Inline-level tracking (bold/italic within paragraphs)
- Character-level precision
- Dynamic markdown editing (only static rendering tested)
- Large document performance (tested with 28-line sample only)
- Syntax highlighting integration (marked.js defaults used)

**No Blockers** for production integration.

---

## Performance Characteristics

**Benchmarks** (sample.md, 28 lines, 10 blocks):
- Parse + render: <50ms (not measured, perceptually instant)
- Selection detection: <1ms (simple DOM traversal)
- Test suite (11 tests): 4.6 seconds (includes browser startup overhead)

**Scalability**: Not tested with large documents (100+ blocks). If needed, consider:
- Virtual scrolling for very long documents
- Lazy rendering of blocks outside viewport
- Debounced line tracking updates during live editing

---

## Key Takeaways

**1. marked.lexer() is reliable**: Line positions exposed via `token.raw` are accurate.

**2. Trim trailing newlines**: Critical for correct lineEnd calculation.

**3. Block-level granularity sufficient**: No need for complex inline parsing.

**4. DOM traversal for selection**: Simple and robust pattern for comment alignment.

**5. TDD approach validated**: Writing tests first caught line counting bugs early.

**6. Playwright E2E effective**: Tests validate real browser behavior, not implementation details.

---

## Next Steps for Production

**Immediate**:
1. Copy renderer logic to `src/renderer/markdown.js`
2. Add review tab IPC handlers in `src/main.js`
3. Create review tab grid layout in `src/renderer/tabs.js`
4. Test with real project markdown files (SPEC.md, PLAN.md, etc.)

**Future Enhancements**:
- Load and display existing reviews from `.hegel/reviews.json`
- Comment editing after submission
- Keyboard shortcuts for review actions
- Multi-file review sessions

---

## Conclusion

**Toy validated the approach**: Line tracking via marked.lexer is feasible and accurate.

**No surprises**: Implementation aligned with initial SPEC expectations.

**Ready for integration**: Core logic proven, patterns established, tests passing.

**Time investment**: Approximately 1-2 hours for full TDD implementation and documentation.

**Confidence level**: High - all edge cases handled, selection pattern robust, no known issues.
