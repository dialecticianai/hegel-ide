# test/lib/

Unit tests for pure utility functions and renderer modules using Vitest.

## Structure

```
test/lib/
├── terminal-env.test.js                Pure function tests for environment building with HTTP URL injection
├── http-server.test.js                 Pure function tests for request parsing, file validation, and project matching
├── markdown-line-tracking.test.js      Line-tracked markdown parsing tests (block detection, line ranges, HTML output)
├── markdown.test.js                    Markdown rendering module tests
├── projects.test.js                    Project discovery and tree building tests
├── split-pane.test.js                  Split-pane state and persistence tests
├── tabs.test.js                        Tab management module tests
└── themes.test.js                      Theme system tests
```

## Running Tests

```bash
npm run test:unit              # Run all unit tests
npm run test:unit:watch        # Watch mode for development
```

## Test Patterns

**Pure functions** (terminal-env, http-server, markdown-line-tracking):
- Direct ESM imports from lib/
- No mocking needed
- Fast execution (<10ms per test)

**Renderer modules** (markdown, projects, split-pane, tabs, themes):
- Load module code via readFileSync and eval
- Mock global objects (window, ipcRenderer, Alpine)
- Test factory function behavior and Alpine data structure
