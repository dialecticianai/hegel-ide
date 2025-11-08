# Markdown Link Navigation Plan

Implementation plan for retroactive TDD on already-built markdown link navigation feature.

## Overview

**Goal:** Write comprehensive e2e tests for the markdown link navigation feature that was already implemented.

**Scope:** Test coverage only - implementation is complete in renderer.js and index.html.

**Methodology:** Write e2e tests that validate the spec requirements. Implementation already passes the behavioral contract.

## Step 1: Write E2E Tests

### Goal
Validate markdown link navigation behavior through Playwright e2e tests.

### Step 1.a: Test Regular Click Navigation

Test strategy:
- Open project with README containing markdown links
- Regular click on markdown link should navigate current tab
- Original tab closes, new file tab opens at same position
- New tab becomes active

Key cases:
- Tab switching after navigation
- Original tab removal
- New tab creation with correct file content

### Step 1.b: Test Modifier Click Behavior

Test strategy:
- Cmd/Ctrl+Click should open new tab without closing current
- Both tabs should exist after click
- New tab should become active

Key cases:
- Tab preservation with modifier keys
- Multi-tab state after navigation
- Active tab switching

### Step 1.c: Test File Deduplication

Test strategy:
- Open file in tab using Cmd+click
- Navigate from another tab to same file
- Should switch to existing tab instead of creating duplicate

Key cases:
- Tab deduplication logic
- Switching to already-open files
- Original tab closes after switch

### Step 1.d: Test External Link Passthrough

Test strategy:
- External links with http:/https: protocols should not be intercepted
- Tab count should not change after external link click
- Electron default behavior preserved

Key cases:
- Protocol filtering works correctly
- No new tabs created for external links

### Step 1.e: Test File-to-File Navigation

Test strategy:
- Navigate from file tab to another file
- Current file tab closes, new file tab opens
- Works same as project-to-file navigation

Key cases:
- Navigation works in file tabs not just project tabs
- Tab replacement behavior consistent

### Step 1.f: Test Tab Position Preservation

Test strategy:
- Open multiple tabs
- Navigate from middle tab position
- New tab should appear at same position
- Tab order preserved

Key cases:
- Tab array splicing at correct index
- Position maintained during navigation

### Success Criteria

- All e2e tests pass validating spec requirements
- Regular click navigation closes source tab and opens target
- Modifier click opens new tab without closing source
- File deduplication prevents duplicate tabs
- External links not intercepted
- Tab position preserved during navigation
- File-to-file navigation works same as project-to-file

## Out of Scope

- Implementation changes (feature already complete)
- Unit tests (behavior is integration-level)
- Hash anchor scrolling tests (browser behavior)
- Performance testing
- Manual testing steps
