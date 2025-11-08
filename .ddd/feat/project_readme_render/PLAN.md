# Implementation Plan: Markdown Browser Phase 1

**Goal**: Implement README.md rendering with theme-aware styling as the foundation for the left panel's markdown browser.

**Scope**: Add markdown rendering infrastructure, file reading capability, and theme system foundation. Keep implementation focused on working functionality - this establishes patterns for future phases.

**Methodology**: TDD where it drives development forward. Test observable behavior (README appears, errors handle gracefully, refresh works). Skip testing library internals or hard-to-test CSS media queries. Focus on integration-level verification that the feature works end-to-end.

---

## Step 1: Infrastructure Setup

### Goal
Add markdown rendering dependency and file reading capability without breaking existing functionality.

### Step 1.a: Add Dependency
- Add marked library to package.json dependencies
- Run npm install to verify installation succeeds
- No tests needed - dependency installation is self-verifying

### Step 1.b: Implement File Reader IPC Handler
- Add get-project-readme handler in main.js
- Handler takes projectPath parameter and returns content or error
- Read README.md file from project directory (exact filename, case-sensitive)
- All file read failures treated as missing file (graceful degradation)
- Return content string on success, error object on any failure

### Success Criteria
- marked appears in package.json dependencies
- npm install completes without errors
- IPC handler registered in main.js
- Handler returns content for valid README.md files
- Handler returns error for missing or unreadable files

**Commit Point: Infrastructure**
Group Steps 1.a and 1.b into single commit - adds dependency and file reading capability together.

---

## Step 2: State Management

### Goal
Extend project details state to track README content separately from metrics data.

### Step 2.a: Extend State Structure
- Add readme field to projectDetails state (string or null)
- Add readmeError field to projectDetails state (string)
- Initialize new fields when creating project detail entries
- Preserve existing data/loading/error fields unchanged

### Step 2.b: Implement README Fetch Logic
- Add fetchProjectReadme function to Alpine component
- Extract project_path from existing project data
- Call get-project-readme IPC handler with projectPath
- Store content in readme field on success
- Store null and error message in readmeError on failure
- Called when project tab opens and when refresh button clicked

### Step 2.c: Integrate with Refresh
- Update refreshProjectDetails function to call both metrics and README fetch
- Both fetches happen independently (one failure doesn't block the other)
- README fetch uses same project data already loaded

### Success Criteria
- projectDetails state includes readme and readmeError fields
- fetchProjectReadme function exists in renderer.js
- Function correctly populates state based on IPC response
- Refresh button triggers both metrics and README refresh
- Existing project detail functionality unchanged

**Commit Point: State Management**
Steps 2.a, 2.b, and 2.c form single logical unit - state extension and fetch logic together.

---

## Step 3: Theme System Foundation

### Goal
Establish theme-aware CSS that responds to system dark/light mode preferences.

### Step 3.a: Define Theme CSS
- Add markdown-content class with base typography styles
- Use CSS media queries for prefers-color-scheme dark and light
- Define CSS variables inside media queries for theme colors
- Dark mode: light text on dark background, appropriate link colors
- Light mode: dark text on light background, appropriate link colors
- Basic markdown element styles: headers, lists, code blocks, links

### Step 3.b: Verify Theme Detection
- Manually verify theme switches when system preference changes
- Check readability of colors in both modes
- No automated tests - visual verification only

### Success Criteria
- CSS includes media query for prefers-color-scheme dark
- CSS includes media query for prefers-color-scheme light
- markdown-content class defined with theme-responsive styles
- Basic markdown elements have appropriate styling

**Commit Point: Theme System**
Step 3.a stands alone - foundational CSS for theme support.

---

## Step 4: UI Rendering

### Goal
Render markdown content below JSON metrics with proper HTML conversion and error states.

### Step 4.a: Add Markdown Rendering
- Import marked library in renderer.js
- Add renderMarkdown helper function that converts markdown to HTML using marked.parse
- Rendering happens when readme content exists in state
- Use marked's default sanitization (sufficient for trusted project files)

### Step 4.b: Update Project Detail Template
- Add README section below existing JSON display in index.html
- Section appears after JSON metrics with visual separator
- When readme content exists: render HTML with markdown-content class
- When readme is null: show gray text message stating project missing README.md
- Use x-show directives to conditionally display content vs message
- Existing JSON metrics display unchanged

### Step 4.c: Wire Up on Tab Open
- Trigger fetchProjectReadme when project tab opens
- Happens after or alongside existing project details fetch
- Use same loading patterns as metrics data

### Success Criteria
- marked library imported in renderer.js
- renderMarkdown function exists and calls marked.parse
- HTML template includes README section below metrics
- Conditional rendering shows content or missing message
- Opening project tab triggers README fetch
- Existing project detail UI unchanged

**Commit Point: UI Rendering**
Steps 4.a, 4.b, and 4.c together complete the user-facing feature.

---

## Step 5: End-to-End Verification

### Goal
Verify complete feature works through automated E2E tests covering key scenarios.

### Step 5.a: Write E2E Tests
- Test: Project with README.md shows rendered content
- Test: Project without README.md shows missing message
- Test: Refresh button updates README content
- Test: Markdown formatting displays correctly (headers, lists visible)
- Add to existing e2e test suite using Playwright
- Tests verify observable behavior only (DOM content, messages)

### Step 5.b: Run Full Test Suite
- Execute npm test to verify all tests pass
- Verify new tests pass consistently
- Verify existing tests remain passing (no regression)

### Success Criteria
- E2E tests added covering README scenarios
- All new tests pass
- All existing tests still pass
- Test execution time acceptable (under 60 seconds total)

**Commit Point: E2E Tests**
Step 5 stands alone - adds test coverage for completed feature.

---

## Commit Summary

Four commits total:

1. **Infrastructure**: Add marked dependency and file reading IPC handler
2. **State Management**: Extend state and implement README fetch logic
3. **Theme System**: Add theme-aware CSS with dark/light mode support
4. **UI Rendering**: Render markdown in project detail tabs with conditional display
5. **E2E Tests**: Add automated tests verifying complete feature behavior

Each commit is a logical, self-contained unit that moves the feature forward.

---

## Out of Scope

Implementation only - these happen in separate workflow phases:
- Manual testing or validation steps
- README.md updates describing new feature
- CLAUDE.md updates with new patterns
- Documentation of theme system for future developers

Technical scope limitations:
- No caching strategy (fetch on every tab open/refresh is acceptable)
- No advanced markdown features (syntax highlighting, TOC generation)
- No README.md variants (exact filename only)
- No document navigation (Phase 1 scope: single file only)
