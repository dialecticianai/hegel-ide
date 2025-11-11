# Hegel IDE Architecture

The cathedral: Electron-based, polished, accessible. For the masses leaving the IDE wastelands.

---

## Technology Stack

**Platform**: Electron (latest stable)
**Rationale**: Cross-platform GUI with web technologies, mature ecosystem, familiar development model

**Language**: Plain JavaScript (ES6+)
**Rationale**: No TypeScript. We don't need training wheels on our JavaScript. Keep it simple and direct.

**UI Framework**: Alpine.js (~15kb)
**Rationale**:
- Lightweight reactivity without framework bloat
- Declarative templates directly in HTML
- No build step required (though bundling optional)
- Perfect fit for Electron renderer process
- Just enough magic to avoid manual DOM manipulation, not enough to move business logic into views

**Markdown Rendering**: marked (~50kb)
**Rationale**: GFM-compatible HTML output, extensible lexer/parser for line tracking, no dependencies, battle-tested

**Key Dependencies** (minimal):
- Electron (platform)
- Alpine.js (UI reactivity)
- Markdown renderer (TBD during Discovery)
- CSS framework/approach (TBD - possibly vanilla or lightweight utility CSS)

---

## Core Architectural Decisions

### Decision: Shell Out to Hegel Binary (Not Reimplementation)

**Choice**: hegel-ide shells out to `hegel` CLI for all operations

**Rationale**:
- Single source of truth (hegel-cli is the canonical implementation)
- Zero business logic duplication
- Automatic feature parity (new hegel commands work immediately)
- Clear separation: IDE is GUI shell, hegel is engine

**How it works**:
- Workflow operations: `hegel start`, `hegel next`, `hegel status`, etc.
- Multi-project: `hegel pm list`, `hegel pm status`, etc.
- Analysis: `hegel analyze`, `hegel top` (don't reimplement in JS)

**Tradeoffs**:
- Requires hegel binary installed/available
- CLI parsing overhead (mitigated by reading JSON files directly when appropriate)
- No offline operation without hegel binary

**Alternatives considered**:
- Reimplement hegel logic in JavaScript: Insane maintenance burden, rejected
- Embed Rust as native module: Complexity not worth it for this use case
- HTTP API wrapper around hegel: Over-engineered, deferred

---

### Decision: Pragmatic File Access (Direct + CLI Hybrid)

**Choice**: Read JSON/markdown files directly, shell out for operations and analysis

**Rationale**:
- Reading `.hegel/state.json` directly is just JSON parsing (no need for CLI overhead)
- Reading markdown files (SPEC.md, VISION.md) is core functionality
- Operations/analysis should use CLI (don't reimplement hegel's logic)

**What we read directly**:
- ✅ JSON files (`.hegel/state.json`, `.hegel/config.toml`, reviews, etc.)
- ✅ JSONL files (`.hegel/hooks.jsonl`, `.hegel/states.jsonl`) for display
- ✅ Markdown files (SPEC.md, PLAN.md, VISION.md, ARCHITECTURE.md, README.md, etc.)
- ✅ Review data (format TBD, likely `.hegel/reviews.json`)

**What we shell out for**:
- ✅ Workflow commands (`hegel start`, `hegel next`, `hegel abort`)
- ✅ Multi-project operations (`hegel pm ...`)
- ✅ Analysis (`hegel analyze` - don't reimplement metrics logic)

**Tradeoffs**:
- Couples to hegel's file format (but formats are stable and simple)
- Must handle file parsing errors gracefully
- CLI output parsing when needed (structured output preferred)

---

### Decision: Standard Electron Process Split

**Choice**: Main process for system access, renderer for UI

**Main Process Responsibilities**:
- Spawn hegel CLI processes (child_process)
- File system access (read JSON/markdown files)
- IPC handlers (expose file/CLI operations to renderer)
- HTTP server for hegel CLI integration (local only)
- Terminal environment injection (HEGEL_IDE_URL)
- Window management

**Renderer Process Responsibilities**:
- Alpine.js UI components
- Markdown rendering (HTML output)
- Review/commenting interface
- Display logic and user interaction
- IPC listeners for programmatic tab opening

**Rationale**: Standard Electron architecture, clear security boundaries

---

### Decision: No Code Editor (Enforced by Design)

**Choice**: Hegel IDE has zero code viewing/editing capabilities

**Rationale**:
- Forced abstraction is the core value proposition
- If users can peek at code, they will micro-manage
- Workflow orchestration is the interface, not code

**What users DO see**:
- Rendered markdown documents (specs, plans, architecture, vision)
- Workflow state and progress
- Test results and execution output
- Metrics and analytics
- Review/commenting interface for markdown docs

**What users DON'T see**:
- ❌ Source code files
- ❌ Syntax highlighting of implementation
- ❌ File tree of .js/.py/.rs files
- ❌ Any traditional "editor" features

**Tradeoffs**:
- Radical departure from traditional IDEs (this is intentional)
- Not for everyone (explicit non-goal: serve users who need to see code)
- Trust through verification (tests, execution) not inspection

---

## System Boundaries

**Internal** (hegel-ide responsibilities):
- Electron app shell and window management
- Alpine.js UI for markdown viewing/reviewing
- Cross-project navigation and management
- File reading (JSON, markdown)
- CLI process spawning and output parsing
- Review/commenting interface

**External** (hegel-cli responsibilities):
- Workflow state machine logic
- Workflow orchestration and transitions
- Metrics collection and analysis
- Multi-project management
- All hegel business logic

**Integration Points**:
- File system: Read `.hegel/` directories, markdown files
- CLI: Spawn `hegel` processes, parse output
- User projects: Discover/navigate projects with `.hegel/` directories
- HTTP server: Local HTTP API for hegel CLI to trigger review tab opening (POST /review)

---

## Core Features (Cathedral vs Monastery)

**Monastery** (hegel-cli + hegel-pm + hegel-mirror):
- Terminal-based, lean Rust tools
- For terminal monks who love the command line

**Cathedral** (hegel-ide):
- Same functionality, Electron-wrapped for accessibility
- hegel-pm: Cross-project management GUI
- hegel-mirror: Markdown review/commenting GUI
- glow-like: Beautiful markdown rendering
- Polished, with bells and whistles

---

## Known Constraints

**Platform**: macOS/Linux/Windows (Electron provides cross-platform)

**Dependencies**:
- Requires hegel binary installed and in PATH
- Node.js/npm for Electron development

**Performance**:
- Electron startup overhead acceptable (cathedral, not monastery)
- Markdown rendering must be smooth for large documents
- CLI spawning overhead negligible for human-initiated operations

**Security**:
- Standard Electron security model
- No network access required (local-first)
- File system access scoped to projects

**Compatibility**:
- Must work with existing hegel-cli projects (read same `.hegel/` structure)
- No lock-in (users can switch back to CLI tools)

---

## Non-Functional Requirements

**Usability**: Accessible for non-terminal users (the whole point of the cathedral)

**Reliability**: Graceful handling of CLI errors, file parsing failures

**Maintainability**:
- Simple codebase (plain JS, minimal dependencies)
- No business logic duplication (shell out to hegel)
- File size limits TBD during Discovery

**Portability**: Cross-platform via Electron

**Performance**: "Good enough" - this is the cathedral, not the lean monastery

---

## IDE-Specific State

**To be determined** (keep simple for now):
- UI preferences (theme, layout)
- Window positions/sizes
- Recently opened projects
- User settings

**Storage options** (evaluate during Discovery):
- Electron userData directory (most robust)
- localStorage in renderer (simplest)
- Separate config file

---

## Resolved Decisions

**Made during implementation:**

- [x] **Markdown rendering library**: marked (extensible lexer for line tracking)
- [x] **CSS framework**: Vanilla CSS with theme system (CSS variables for theming)
- [x] **Review/commenting UX**: Grid layout with content area + collapsible comment margin, selection-based commenting, card stacking for multiple comments
- [x] **CLI output parsing**: JSON output from hegel commands (`--json` flag)
- [x] **Build system**: esbuild for fast bundling of renderer modules
- [x] **CLI-to-IDE communication**: HTTP server in main process (port 0, OS-assigned) with HEGEL_IDE_URL env var injection for bidirectional integration

## Open Questions

**Still to investigate:**

- [ ] Syntax highlighting for code blocks in markdown (even though no code editor)
- [ ] Multi-project dashboard design
- [ ] Build/distribution strategy (electron-builder, forge, manual)
- [ ] Auto-update mechanism (or manual updates acceptable)
- [ ] Performance characteristics at scale (large documents, many projects)
- [ ] Other technical unknowns TBD

---

## Philosophy Layer (Not Mentioned in Most Tech Stacks)

**Dialectic-Driven Development (DDD)**: The programming paradigm powering hegel

Hegel orchestrates workflows. DDD is the philosophy.
The cathedral brings both to the masses.
