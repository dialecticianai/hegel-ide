# Markdown Review Tab Implementation Plan

---

## Overview

**Goal**: Implement markdown review functionality with inline commenting aligned to document blocks, following strict TDD discipline.

**Scope**:
- Refactor file tabs to use absolute paths (breaking change)
- Create new review tab type with grid layout and comment margin
- Enable block-level text selection and commenting
- Integrate with hegel CLI for review persistence (exact syntax TBD)

**Priorities**:
1. Maintain test coverage throughout refactoring
2. Grid layout leverages DOM for alignment
3. Batched comment submission model
4. Clean separation between file viewing and review modes

---

## Methodology

**TDD Approach**:
- Write failing E2E tests before implementation
- Focus on user-facing behavior and integration points
- Skip testing internal helpers and utilities
- Cover core workflow and essential error cases only

**What to Test**:
- Tab opening and rendering for both file and review types
- Text selection detection and comment form display
- Comment queue management and UI updates
- Submit/cancel workflows with success and error paths
- Grid layout structure and margin visibility

**What NOT to Test**:
- CSS positioning calculations (trust the browser)
- Z-index ordering logic (visual concern)
- Markdown parsing internals (trust marked library)
- Internal state transformations (test observable behavior only)

---

## Step 1: Refactor File Tabs to Absolute Paths

### Goal
Break current project-scoped file tab implementation to use absolute paths only, establishing foundation for standalone file support.

### Step 1.a: Update File Tab Tests

Update existing file tab E2E tests in the test suite to use absolute paths. Modify test fixtures and assertions to expect absolute path pattern in tab data structure. Tests should verify that file tabs open with absolute paths, render markdown content correctly, and maintain proper tab lifecycle.

### Step 1.b: Refactor Tab Data Structure

Modify the tab creation logic in tabs module to use absolute file paths. Remove projectName and relative filePath fields from file tab objects. Update tab ID generation to use file path hashing or sanitization. Ensure file content loading works with absolute paths via updated IPC handlers.

### Step 1.c: Update IPC Handlers

Modify the get-project-file IPC handler to accept absolute paths directly instead of project-relative paths. Update file content fetching logic to read from absolute paths. Add validation to ensure paths are absolute and files exist.

### Success Criteria

- E2E tests pass with absolute path pattern
- File tabs open and render markdown from absolute paths
- Build succeeds with no warnings
- Tab IDs are unique and stable for same file path

**Commit Point**: `refactor(tabs): migrate file tabs to absolute paths`

---

## Step 2: Create Line-Tracking Markdown Module

### Goal
Extract line-tracking markdown renderer as independent pure functions, enabling unit testing with vitest and reuse across components.

**Reference**: `.ddd/toys/toy3_markdown_line_tracking/` contains validated implementation and learnings.

### Step 2.a: Write Vitest Unit Tests

Create vitest test suite for line-tracking functions. Test parseMarkdownWithLines with array output format for various markdown structures. Verify line numbers match expectations for single-line blocks, multi-line blocks, code blocks, lists, and blockquotes. Test edge cases like empty markdown, whitespace-only, and consecutive blank lines. Test findMarkdownBlock with mock DOM nodes.

### Step 2.b: Implement Line-Tracking Module

Create new file `src/renderer/markdown-line-tracking.js` with pure functions. Export parseMarkdownWithLines function that uses marked.lexer to tokenize markdown and extract line positions from token.raw. Implement line number calculation with trailing newline handling - trim token.raw.trimEnd to separate content newlines from whitespace newlines. Export findMarkdownBlock function for DOM traversal from selection node to containing markdown-block element. Wrap rendered blocks in divs with data-line-start, data-line-end, and data-type attributes.

**Key implementation details from toy3:**
- Count newlines in token.raw.trimEnd for lineEnd calculation
- Advance line counter by total newlines including trailing whitespace
- Skip space tokens but advance line counter to maintain sequential numbering
- Map token types to simplified block types (heading, paragraph, code, list, blockquote, hr, table)

### Step 2.c: Write E2E Integration Test

Add Playwright E2E test that verifies line-tracking module works in Electron context. Test should load markdown file, parse with line tracking, and verify rendered DOM has correct data attributes. This validates that pure functions work correctly when integrated with Alpine and Electron IPC. Keep existing renderMarkdown and file tab tests unchanged to verify backward compatibility.

### Success Criteria

- Vitest unit tests pass for parseMarkdownWithLines and findMarkdownBlock
- E2E tests verify line tracking attributes on rendered blocks in Electron
- All block types (paragraphs, headings, code, lists, tables, blockquotes) get line metadata
- Line numbers match source markdown accurately (verified against toy3 sample)
- Module exports pure functions with no Alpine or Electron dependencies
- Existing file tab rendering and tests unchanged

**Commit Point**: `feat(markdown): add line-tracking module with unit tests`

---

## Step 3: Add Review Tab Infrastructure

### Goal
Create new review tab type with basic structure, enabling tab creation and content loading without comment functionality yet.

### Step 3.a: Test Review Tab Creation

Write E2E test that programmatically opens a review tab via new IPC handler. Verify tab appears in leftTabs array with correct type and structure. Check that markdown content renders with line tracking. Confirm comment margin exists but is initially collapsed.

### Step 3.b: Implement Review Tab Type

Add new tab type to tabs module with review-specific data structure. Create openReviewTab function that initializes tab with empty pendingComments array and marginCollapsed state. Add IPC handler in main process for opening review tabs. Implement tab rendering logic in HTML template for review type.

### Step 3.c: Add Grid Layout Structure

Create CSS grid layout for review tabs with two columns: content area and comment margin. Configure grid rows to align with rendered markdown blocks. Add collapse/expand toggle button for comment margin. Implement margin visibility state management.

### Success Criteria

- E2E tests verify review tab opens and renders correctly
- Grid layout displays with content area and collapsible margin
- Line-tracked blocks render in left column
- Empty comment margin cells render in right column
- Margin toggle button works

**Commit Point**: `feat(tabs): add review tab type with grid layout`

---

## Step 4: Implement Selection and Comment Form

### Goal
Enable text selection within markdown blocks and display comment input form in aligned margin cell.

### Step 4.a: Test Selection Detection

Write E2E test that simulates text selection in a markdown block using Playwright's selection API. Verify that selection detection identifies the correct block and line range. Check that comment form appears in the margin aligned to the selected block. Test that form pre-populates with selected text excerpt.

### Step 4.b: Add Selection Event Handlers

Implement mouseup event listener on markdown content area that captures window.getSelection. Use findMarkdownBlock function from line-tracking module to walk DOM tree and extract line range from data attributes. Show comment input form in corresponding margin cell with selected text and line range. Function already tested in Step 2 unit tests.

### Step 4.c: Build Comment Form Component

Create comment form UI component using Alpine.js data binding. Include read-only selected text display, textarea for comment input, and save/cancel buttons. Handle form submission by adding comment to pendingComments queue. Clear selection and hide form on cancel.

### Success Criteria

- E2E tests verify selection triggers comment form display
- Comment form appears in correct margin row aligned to block
- Form pre-populates with selected text and line range
- Save button adds comment to queue
- Cancel button dismisses form without saving

---

## Step 5: Implement Comment Display and Stacking

### Goal
Render comment cards in margin with stacking behavior for multiple comments on same block.

### Step 5.a: Test Comment Card Rendering

Write E2E test that creates multiple comments on the same block. Verify that comment cards appear stacked with visual offset. Check that most recent comment appears on top (highest z-index). Test that clicking visible edge of lower card brings it to top.

### Step 5.b: Render Comment Cards

Implement comment card rendering in margin cells using Alpine.js templates. Loop through pendingComments for each block's line range. Apply CSS transforms for stacking offset and z-index ordering. Add click handler for z-index reordering.

### Step 5.c: Manage Margin Visibility

Implement auto-expand behavior when first comment is created. Auto-collapse margin after successful review submission. Preserve manual toggle state during comment creation. Update margin width and layout on collapse/expand transitions.

### Success Criteria

- E2E tests verify multiple comments stack correctly
- Most recent comment visible on top
- Click interaction reorders z-index
- Margin expands on first comment creation
- Margin collapses after successful submit

**Commit Point**: `feat(review): implement comment display and stacking`

---

## Step 6: Add Submit and Cancel Workflows

### Goal
Enable batched submission of comments via hegel CLI integration and cancellation with confirmation.

### Step 6.a: Test Submit Workflow

Write E2E test that creates several comments, then clicks Submit Review button. Use Playwright IPC mocking to intercept save-review handler calls and return fake responses (success and error cases). Verify that handler is invoked with correct review data structure matching Mirror's format. Check that pendingComments array is cleared and margin collapses after success. Test error case where mocked response indicates failure - verify comments are preserved and error message shown.

**CRITICAL**: Tests must mock IPC responses, not rely on stubbed handler. This keeps tests isolated and prevents writing test data to real project `.hegel/reviews.json` files during dogfooding.

### Step 6.b: Implement Submit Handler

Add submit button to review tab toolbar. Create submitReview function that gathers all pendingComments and formats for hegel CLI. Add new IPC handler called save-review that currently STUBS the hegel CLI integration - simply return fake success response. Handle success by clearing queue and collapsing margin. Handle errors by preserving comments and displaying error message.

**CRITICAL**: The hegel CLI command for saving reviews does not exist yet. Stub the IPC handler to return fake success for now: `return { success: true }`. This allows full end-to-end testing of UI workflows without blocking on CLI implementation. When the actual CLI command is implemented later, replace the stub with real spawn/stdin/stdout logic following the pattern of existing hegel commands in main.js.

### Step 6.c: Implement Cancel Workflow

Add cancel button to review tab toolbar. Show confirmation dialog if pendingComments is non-empty. Clear pendingComments array and collapse margin on confirmed cancellation. Skip confirmation if no pending comments exist.

### Success Criteria

- E2E tests verify submit workflow with mocked hegel CLI
- Comments cleared and margin collapses on successful submit
- Comments preserved and error shown on failed submit
- Cancel button clears comments with confirmation
- No confirmation shown for empty comment queue

**Commit Point**: `feat(review): add submit and cancel workflows`

---

## Step 7: Integration Testing and Cleanup

### Goal
Add comprehensive E2E tests covering full review workflows and edge cases.

### Step 7.a: Write Integration Tests

Create E2E test file specifically for review workflows. Test complete flow: open review tab, select text across multiple blocks, create several comments, submit successfully. Test error recovery flow: submit failure preserves state. Test cancellation with and without confirmation. Test switching between file and review tabs for same file.

### Step 7.b: Update Existing Tests

Review and update all affected E2E tests for breaking changes to file tabs. Ensure tab tests use absolute paths. Verify markdown rendering tests still pass. Check that terminal and split-pane tests are unaffected.

### Success Criteria

- Full E2E test suite passes: npm test
- New review workflow tests cover core scenarios
- Existing tests updated for file tab changes
- Build succeeds with no warnings
- No test flakiness or race conditions

**Commit Point**: `test(review): add comprehensive E2E coverage`

---

## Commit Summary

**Commit 1**: Refactor file tabs to use absolute paths (breaking change)
**Commit 2**: Add line-tracking markdown renderer for review mode
**Commit 3**: Create review tab type with grid layout infrastructure
**Commit 4**: Implement comment display, stacking, and margin management
**Commit 5**: Add submit and cancel workflows with hegel CLI integration
**Commit 6**: Complete integration testing and cleanup

Total: 6 logical commits representing incremental feature development.
