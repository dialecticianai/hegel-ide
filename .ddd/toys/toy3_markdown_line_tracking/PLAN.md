# Markdown Line-Tracking Renderer Implementation Plan

---

## Overview

**Goal**: Build standalone line-tracking markdown renderer using marked.js lexer API, validated through Playwright E2E tests.

**Scope**:
- Parse markdown and extract line positions from tokens
- Wrap rendered blocks with line metadata attributes
- Create testable HTML page with Alpine.js display
- Validate accuracy through DOM queries and selection simulation

**Priorities**:
1. Understand marked.js token structure and line position exposure
2. TDD approach with E2E tests as primary validation
3. Keep implementation minimal (single-file renderer if possible)
4. Focus on block-level granularity only

---

## Methodology

**TDD Approach**:
- Write Playwright tests that load HTML page and query DOM
- Tests assert on observable behavior (data attributes, DOM structure)
- No unit testing of internal functions
- Manual inspection capability as secondary validation

**What to Test**:
- Rendered blocks have correct line start/end attributes
- Line numbers match source markdown file positions
- Block types correctly identified in data-type attribute
- Selection detection extracts correct line range from DOM
- Edge cases: empty markdown, single-line blocks, multi-line blocks

**What NOT to Test**:
- Marked.js internals or token parsing details
- HTML rendering correctness (trust marked library)
- Alpine.js reactivity patterns
- CSS styling or visual appearance
- Performance or large document handling

---

## Step 1: Project Setup and Sample Fixture

### Goal
Create toy directory structure with sample markdown file containing diverse block types for testing.

### Step 1.a: Create Project Files

Create the basic file structure for the toy. Initialize with empty HTML page, empty JavaScript renderer module, and empty test file. Create sample markdown fixture with known line positions containing headings, paragraphs (including multi-line), code blocks, ordered and unordered lists, and blockquote. Document the expected line ranges in comments within the sample file for reference during testing.

### Step 1.b: Setup Playwright Configuration

Add Playwright test configuration specific to this toy. Configure to run tests against static HTML file served via local server or file protocol. Set up test command in package.json or use main project test infrastructure. Ensure tests can be run in isolation from main project tests.

### Success Criteria

- Directory structure created with all placeholder files
- Sample markdown file contains at least six different block types
- Line positions are known and documented
- Playwright can discover and run toy tests
- Test command executes without configuration errors

---

## Step 2: Basic Renderer and Initial Test

### Goal
Implement minimal viable renderer that parses markdown and wraps blocks with line attributes, validated by single-block test case.

### Step 2.a: Write Single-Block Test

Write Playwright test that loads HTML page containing single paragraph of markdown. Test queries DOM for element with markdown-block class. Assert that element exists, has data-line-start and data-line-end attributes, and both attributes equal one. Verify data-type attribute equals paragraph. Verify rendered HTML contains expected paragraph tag.

### Step 2.b: Implement Token-Based Renderer

Implement JavaScript function that uses marked.lexer to tokenize markdown input. Extract token type and raw text from first token. Calculate line range by counting newlines in token.raw property. Use marked.parse to render token HTML. Wrap rendered HTML in div element with markdown-block class and data attributes for line range and type. Return wrapped HTML string.

### Step 2.c: Integrate with HTML Page

Create HTML page structure with Alpine.js initialization. Add script tag importing marked library from CDN or local copy. Add script tag for renderer module. Create Alpine component that loads hardcoded single-paragraph markdown string, passes to renderer, and displays result in DOM. Configure page to be accessible via file protocol or local server for Playwright testing.

### Success Criteria

- Playwright test passes for single-paragraph case
- HTML page displays rendered markdown with visible data attributes in devtools
- marked.lexer successfully tokenizes markdown
- Line numbers correctly calculated from token
- Wrapper div structure matches expected format

**Commit Point**: `feat(toy3): add basic line-tracking renderer for single blocks`

---

## Step 3: Multi-Block Support and Line Position Tracking

### Goal
Extend renderer to handle multiple consecutive blocks with accurate sequential line numbering.

### Step 3.a: Write Multi-Block Test

Write Playwright test using sample markdown fixture with multiple blocks. Load HTML page that renders the full sample. Query DOM for all elements with markdown-block class. Assert count matches expected number of blocks from fixture. Iterate through blocks and verify each has sequential line numbers with no gaps or overlaps. Verify line numbers match documented positions in sample file. Assert data-type attributes match expected block types.

### Step 3.b: Implement Full Document Parsing

Update renderer to process all tokens from marked.lexer output. Maintain running line counter that increments as tokens are processed. For each token, calculate start line from current counter position. Calculate end line by counting newlines in token.raw and adding to start line. Render token HTML and wrap with attributes. Accumulate wrapped HTML for all blocks. Handle whitespace between blocks by tracking blank lines. Return concatenated HTML string or array of block objects depending on caller needs.

### Step 3.c: Handle Block Type Mapping

Add logic to map marked token types to simplified block type names for data-type attribute. Map heading tokens to heading type. Map paragraph tokens to paragraph type. Map code tokens to code type. Map list tokens (both ordered and unordered) to list type. Map blockquote tokens to blockquote type. Map hr tokens to hr type. Map table tokens to table type. Ensure mapping covers all token types present in sample fixture.

### Success Criteria

- Multi-block test passes for full sample document
- All blocks render with correct line ranges
- Line numbers are sequential with no gaps
- Block types correctly identified for all token types
- Line counter accurately tracks position through document
- Multi-line blocks have lineEnd greater than lineStart
- Single-line blocks have lineStart equal to lineEnd

**Commit Point**: `feat(toy3): support multi-block documents with sequential line tracking`

---

## Step 4: Selection Detection and Comment Mapping

### Goal
Validate that line range metadata enables accurate selection-to-line-range mapping through DOM traversal.

### Step 4.a: Write Selection Test

Write Playwright test that renders sample markdown and simulates text selection within a specific block. Use Playwright locator to find target paragraph or code block by text content. Use Playwright selection API to select text within that block. Execute JavaScript in browser context to get window.getSelection result. Walk DOM from selection anchor node to find closest ancestor with markdown-block class. Extract data-line-start and data-line-end attributes from found element. Assert extracted line range matches expected range for that block in source.

### Step 4.b: Add Selection Helper

Create helper function in renderer module that takes a DOM node and walks up the tree to find containing markdown-block element. Extract and parse line range attributes as integers. Return object with lineStart, lineEnd, and selectedText properties. Handle edge case where node is not within a markdown block by returning null. This function will be used by review tab feature but tested here in isolation.

### Step 4.c: Test Multiple Selections

Extend test to simulate selections in different block types. Test selection in heading, paragraph, code block, and list. Verify line range extraction works consistently across all block types. Test selection at start of document, middle, and end. Verify no off-by-one errors in line number extraction.

### Success Criteria

- Selection test passes for single block
- Selection helper correctly traverses DOM to find container
- Line range extraction accurate for all tested block types
- Multi-selection test passes with different block types
- Edge cases handled (no containing block returns null)
- Selection API integration works in Playwright browser context

**Commit Point**: `test(toy3): validate selection-to-line-range mapping`

---

## Step 5: Edge Cases and Error Handling

### Goal
Ensure renderer handles edge cases gracefully without throwing errors.

### Step 5.a: Write Edge Case Tests

Write Playwright tests for edge cases. Test empty markdown string produces empty result or empty array. Test markdown with only whitespace produces no blocks. Test markdown with consecutive blank lines maintains correct line numbering. Test single-line document produces single block with matching start and end lines. Test document ending with blank lines handles line count correctly.

### Step 5.b: Add Defensive Checks

Update renderer to validate input. Check for null or undefined markdown input and return empty result. Handle tokens with missing or malformed raw property by using fallback line calculation. Ensure line counter never decrements or resets mid-parse. Add bounds checking to prevent negative line numbers. Ensure token type mapping has default fallback for unknown token types.

### Step 5.c: Test Invalid Input Handling

Write tests for invalid or malformed input. Test markdown with unusual unicode characters renders without errors. Test markdown with HTML tags preserved or escaped correctly. Test markdown with code blocks containing markdown syntax preserves literal content. Verify renderer does not throw exceptions for any valid markdown input.

### Success Criteria

- Edge case tests pass for empty and whitespace-only input
- Consecutive blank lines handled correctly
- Single-line document test passes
- Invalid input tests pass without exceptions
- Defensive checks prevent errors from malformed tokens
- Unknown token types get default type attribute value
- No runtime errors for any markdown input in sample set

**Commit Point**: `fix(toy3): handle edge cases and invalid input`

---

## Step 6: Integration Validation and Documentation

### Goal
Validate complete functionality against all test scenarios and document learnings for main feature integration.

### Step 6.a: Run Full Test Suite

Execute complete Playwright test suite covering all implemented scenarios. Verify all tests pass consistently without flakiness. Run tests multiple times to check for race conditions or timing issues. Validate tests run quickly (under five seconds total for toy scope). Check test output for clear failure messages when assertions fail.

### Step 6.b: Manual Inspection Validation

Open HTML page in browser manually. Inspect DOM using browser devtools. Verify all markdown-block elements have data attributes. Check line numbers by comparing rendered output side-by-side with source markdown file. Select text in different blocks and use browser console to verify selection helper function works. Confirm visual rendering matches expectations for all block types.

### Step 6.c: Document Learnings

Write LEARNINGS.md file capturing key insights from implementation. Document how marked.lexer exposes line information through token.raw property. Explain line counting methodology and any gotchas encountered. Note any limitations of block-level granularity. Document selection detection pattern for use in main feature. Include recommendations for integration into Electron app with Alpine.js and IPC. List any marked.js API quirks or version-specific behaviors discovered.

### Success Criteria

- All Playwright tests pass consistently
- Test suite runs in under five seconds
- Manual inspection confirms line numbers match source
- Selection detection works in browser console testing
- LEARNINGS.md documents implementation insights
- Integration recommendations captured for main feature
- No blockers identified for production integration

**Commit Point**: `docs(toy3): document learnings and integration recommendations`

---

## Commit Summary

**Commit 1**: Add basic line-tracking renderer for single blocks
**Commit 2**: Support multi-block documents with sequential line tracking
**Commit 3**: Validate selection-to-line-range mapping
**Commit 4**: Handle edge cases and invalid input
**Commit 5**: Document learnings and integration recommendations

Total: 5 logical commits representing incremental development with TDD discipline.
