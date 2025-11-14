# ESBuild Migration - Implementation Plan

---

## Overview

**Goal:** Migrate hegel-ide from IIFE modules with script tags to ESM modules with esbuild bundling, reorganize code into src/ directory, and bundle Alpine.js locally.

**Scope:** Refactoring and tooling migration. This is primarily a restructuring effort, not new feature development.

**Priorities:**
1. Preserve all existing functionality
2. Maintain clean git history with logical commit boundaries
3. Verify migration through existing test suite
4. Keep changes minimal and focused

---

## Methodology

**Testing Approach:**
This is a refactoring migration, not new feature development. Validation comes from:
- Build process succeeds without errors
- Application launches and runs without console errors
- Existing Playwright e2e test suite passes unchanged
- All existing functionality works identically to before

**TDD Considerations:**
No new tests required for this migration. Existing tests serve as regression suite. If tests need path updates due to file moves, those are implementation details, not test design changes.

**Commit Strategy:**
Group related changes into logical commits:
- Project scaffolding together (deps, structure, tooling)
- Code transformation together (ESM conversion, file moves)
- Configuration updates together (package.json, paths)
- Separate commits only for substantial changes that warrant review isolation

---

## Step 1: Project Scaffolding

### Goal
Set up build infrastructure and directory structure before moving any code.

### Step 1.a: Install Dependencies
Add esbuild and alpinejs to the project:
- Add esbuild as devDependency for bundling
- Add alpinejs as runtime dependency to bundle locally
- Run npm install to fetch packages

### Step 1.b: Create Directory Structure
Establish source and output directories:
- Create src/ directory for all source code
- Create src/renderer/ subdirectory for renderer modules
- Add dist/ to gitignore for build artifacts

### Step 1.c: Create Build Script
Implement esbuild build configuration:
- Create esbuild.js in project root
- Configure renderer bundling: entry src/renderer/index.js, output dist/renderer.js
- Configure asset copying: copy index.html and styles.css from src/renderer/ to dist/
- Configure build options: browser platform, es2020 target, source maps enabled, no minification
- Add error handling to exit with non-zero code on failure

### Success Criteria
- esbuild and alpinejs appear in package.json dependencies
- node_modules contains both packages
- src/ and src/renderer/ directories exist
- dist/ listed in gitignore
- esbuild.js exists and runs without syntax errors
- Build script handles missing entry point gracefully with clear error message

**Commit Point:** `chore(build): add esbuild tooling and project structure`

---

## Step 2: File Migration

### Goal
Move all source files to src/ structure without modifying content yet.

### Step 2.a: Move Main Process
Relocate main process entry point:
- Move main.js to src/main.js
- Content remains identical, just location changes

### Step 2.b: Move Renderer Modules
Relocate all renderer JavaScript modules:
- Move lib/split-pane.js to src/renderer/split-pane.js
- Move lib/tabs.js to src/renderer/tabs.js
- Move lib/terminals.js to src/renderer/terminals.js
- Move lib/projects.js to src/renderer/projects.js
- Move lib/markdown.js to src/renderer/markdown.js
- Move lib/themes.js to src/renderer/themes.js
- Move lib/app.js temporarily (will be transformed into index.js in next step)
- Content unchanged at this stage

### Step 2.c: Move Static Assets
Relocate HTML and CSS to renderer directory:
- Move index.html to src/renderer/index.html
- Move styles.css to src/renderer/styles.css
- Content unchanged

### Success Criteria
- All files present in src/ structure
- Original lib/ directory still exists (keep for safety during migration)
- File contents byte-identical to originals
- No broken file references yet (will be fixed in configuration step)

---

## Step 3: ESM Conversion

### Goal
Transform IIFE modules to ESM format and create bundle entry point.

### Step 3.a: Convert Module Exports
Transform each renderer module from IIFE to ESM:
- Remove IIFE wrapper function from all modules
- Remove global.HegelIDE namespace assignments
- Add export statements for factory functions
- Keep function bodies and logic completely unchanged
- Modules to convert: split-pane, tabs, terminals, projects, markdown, themes

### Step 3.b: Create Entry Point
Build new index.js that imports all modules and initializes Alpine:
- Create src/renderer/index.js
- Import Alpine from alpinejs package
- Import all factory functions from local modules
- Set window.Alpine for template usage
- Define Alpine.data component combining all module factories
- Initialize default terminal on DOMContentLoaded
- Start Alpine framework
- This replaces the old lib/app.js pattern

### Step 3.c: Update HTML Script Tags
Modify index.html to use bundled renderer:
- Remove all individual lib/*.js script tags
- Remove Alpine.js CDN script tag
- Add single script tag loading renderer.js
- Update stylesheet path to relative styles.css
- Update xterm.css path handling (either copy node_modules file or update path)

### Success Criteria
- All src/renderer/*.js files use export statements, no IIFE wrappers
- No references to window.HegelIDE namespace in renderer modules
- src/renderer/index.js imports all modules and initializes Alpine
- index.html contains single renderer.js script tag
- No CDN script tags in HTML
- HTML references local CSS files

**Commit Point:** `refactor(renderer): convert IIFE modules to ESM with esbuild`

---

## Step 4: Configuration Updates

### Goal
Update project configuration to use new paths and build process.

### Step 4.a: Update Package.json
Modify package.json for new structure:
- Change main field from "main.js" to "src/main.js"
- Update start script to run build before electron launch
- Update test script to run build before playwright
- Keep test:unit scripts unchanged (vitest doesn't need build)

### Step 4.b: Update Main Process Paths
Modify src/main.js to load from dist/:
- Change loadFile call from "index.html" to "dist/index.html"
- All IPC handlers unchanged (paths are runtime, not affected by migration)

### Success Criteria
- package.json main field points to src/main.js
- npm start script includes build step
- npm test script includes build step
- src/main.js loads HTML from dist/ directory
- No hardcoded references to old lib/ paths in configuration

**Commit Point:** `chore(config): update paths for src/ structure`

---

## Step 5: Build and Verify

### Goal
Confirm migration successful through automated verification.

### Step 5.a: Execute Build
Run the build process:
- Execute npm run build
- Verify dist/renderer.js created
- Verify dist/index.html and dist/styles.css copied
- Check for any build warnings or errors
- Verify source maps generated

### Step 5.b: Launch Application
Test application startup:
- Run npm start
- Verify window opens
- Check DevTools console for errors
- Verify no missing module errors
- Verify Alpine.js initialized (check window.Alpine exists)

### Step 5.c: Functional Verification
Test core functionality manually:
- Verify Projects tab loads project list
- Verify Settings tab theme selector works
- Verify terminal tab accepts input and shows output
- Verify adding/closing tabs works
- Verify split pane drag works
- Verify markdown rendering works
- All features should behave identically to pre-migration

### Step 5.d: Run Test Suite
Execute automated test suite:
- Run npm run test:all to execute both unit and e2e tests
- All tests should pass unchanged
- If any tests fail due to path issues in test code, update test file imports as needed
- No changes to test assertions or test logic

### Success Criteria
- npm run build completes successfully
- dist/ directory contains renderer.js, index.html, styles.css
- Application launches without errors
- No console errors in DevTools
- All manual functionality tests pass
- npm run test:all passes completely
- Bundle size under 500KB as specified in SPEC
- Source maps allow debugging original files in DevTools

---

## Step 6: Cleanup

### Goal
Remove obsolete files and finalize migration.

### Step 6.a: Remove Old Files
Delete original lib/ directory and root files:
- Delete lib/ directory entirely
- Delete old main.js from root (now in src/)
- Delete old index.html from root (now in src/renderer/)
- Delete old styles.css from root (now in src/renderer/)

### Step 6.b: Verify Clean State
Confirm clean working tree:
- Only src/ directory and dist/ build artifacts remain
- Git status shows only expected changes
- No orphaned files or directories

### Success Criteria
- lib/ directory deleted
- Old root-level source files deleted
- Build and application launch still work after cleanup
- Git working tree clean except for migration changes

**Commit Point:** `chore(cleanup): remove old lib/ structure`

---

## Contingency Plans

**If build fails:**
- Check esbuild.js syntax
- Verify all import paths use .js extensions
- Verify entry point src/renderer/index.js exists
- Check for circular dependencies

**If application fails to launch:**
- Check DevTools console for specific errors
- Verify dist/index.html exists and paths are relative
- Verify Alpine import syntax
- Check that window.Alpine is set before Alpine.start()

**If tests fail:**
- Check if failure is path-related in test code
- Update test imports to use src/ paths
- Verify build ran before tests
- Check if test is actually testing different behavior vs. path issue

**If functionality broken:**
- Compare bundled renderer.js to original lib/ files in DevTools
- Check for missing module exports
- Verify all factory functions exported correctly
- Check Alpine initialization order

---

## Out of Scope

**Not included in this plan:**
- TypeScript migration
- Security improvements (contextIsolation, preload)
- Code reorganization beyond src/ structure
- CSS bundling or processing
- Watch mode or hot reload
- Performance optimization or minification
- Additional testing infrastructure

**Explicitly avoiding:**
- Changes to main process logic
- Changes to IPC handler implementations
- Changes to Alpine.js usage patterns in templates
- Changes to terminal or project management code
- Changes to test assertions (only path updates if needed)

---

## Notes

**Migration Philosophy:** This is a tool change, not a feature change. Every piece of functionality should work identically before and after. The existing e2e test suite is our regression safety net.

**Rollback Strategy:** Keep old lib/ directory until final verification passes. If critical issues found, can revert by restoring package.json paths and rolling back commits.

**Testing Focus:** Manual verification covers interactive features (tabs, terminals, UI). Automated tests cover programmatic behavior. Together they provide complete regression coverage.
