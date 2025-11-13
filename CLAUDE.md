# Hegel IDE Project

This project is **hegel-ide**, a subproject of the Hegel ecosystem. See [README.md](./README.md) for project-specific details.

**What is hegel-ide?** An Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

**Code navigation:** Always start with code maps in `src/**/README.md` files, then read files in a targeted manner. Never grep randomly for "likely" phrases.

## UI Design Principles

**Core aesthetic:** Minimal and unobtrusive, but maximally informative.

**Information density:**
- Use cryptic abbreviations liberally (i/o/e/p, not "input tokens"/"output tokens")
- Always provide concise explanatory tooltips (via `title` attribute)
- Path compression ($HOME replacement, ellipsis overflow with full path on hover)
- Abbreviated numbers (143k, not 143578) for metrics
- Time ago format ("2 hours ago", not ISO timestamps) for recency

**Visual hierarchy:**
- Cards go edge-to-edge (no side padding) for clean alignment
- Use theme system CSS variables (`var(--text-primary)`, `var(--bg-secondary)`, etc.)
- Monospace fonts for data values, system fonts for labels
- Pipe separators (`|`) for compact horizontal layouts
- Minimal margins between related elements

**Interactivity:**
- Tooltips for everything that's abbreviated or compressed
- Help cursor (`cursor: help`) on items with tooltips
- Icons in tabs (⟳ for refresh, × for close) to save space
- Spinning animations for loading states

**Examples:**
- Good: `143k i | 147k o | 748 e | 233 p` with tooltips
- Bad: `Input Tokens: 143,578 | Output Tokens: 147,696 | Events: 748 | Phases: 233`
- Good: `$HOME/Code/proj` (truncated, hover shows full path)
- Bad: `/Users/username/Code/github.com/org/project`

## One-off Transformation Scripts

**Location:** `scripts/oneoffs/`
**Naming:** `YYYYMMDD-description.pl` or `YYYYMMDD-N-description.pl` (indexed if multiple same day)
**Pattern:** Default to dry-run preview, require `--apply` flag to execute changes
**Template-driven:** Read most recent script and adapt the pattern
**Immutable:** Don't modify old scripts - they're timestamped artifacts

## Relationship to `hegel` CLI

**Two roles for `hegel` in this project:**

1. **For AI agents working on this codebase:** Use `hegel` for workflow orchestration (see sections below)
2. **For this application's runtime:** This IDE uses `hegel` as its backend "database driver" - querying projects, workflow state, and metrics via commands like `hegel pm discover list --json`

---

# Using Hegel for Workflow Orchestration

The sections below document how AI agents should use the `hegel` CLI tool for structured development.

**Hegel** orchestrates Dialectic-Driven Development through state-based workflows. Use it for structured development cycles, command guardrails, AST-aware code transformations, and metrics collection.

**Core principle:** Use when structure helps, skip when it doesn't. The user always knows best.

---

## Command Reference

All commands support `--help` for detailed options. Use `hegel <command> --help` for specifics.

**State directory override:** All commands accept `--state-dir <path>` flag or `HEGEL_STATE_DIR` env var to override default `.hegel/` location. Useful for testing, multi-project workflows, or CI/CD.

### Initialization

```bash
hegel init          # Smart detection: greenfield or retrofit workflow
hegel config list   # View all configuration
hegel config get <key>
hegel config set <key> <value>
```

**Config keys:**
- `code_map_style` - `monolithic` or `hierarchical` (default: hierarchical)
- `use_reflect_gui` - Auto-launch review GUI: `true` or `false` (default: true)

**Init workflows:**
- **Greenfield** (no code): Creates CLAUDE.md, VISION.md, ARCHITECTURE.md, initializes git
- **Retrofit** (existing code): Analyzes structure, creates code maps in README.md files, integrates DDD patterns

### Workflows

```bash
hegel start <workflow> [node]   # Load workflow (optionally at specific node)
hegel status                    # Show current state
hegel next                      # Advance to next phase (auto-infers completion claim)
hegel restart                   # Return to SPEC phase (restart cycle, keep same workflow)
hegel repeat                    # Re-display current prompt
hegel abort                     # Abandon workflow entirely (only use with explicit user instruction)
hegel reset                     # Clear all state (only use with explicit user instruction)
```

**Workflows:**
- `cowboy` - **DEFAULT** - Minimal overhead for straightforward tasks (just LEXICON guidance)
- `init-greenfield` - CUSTOMIZE_CLAUDE → VISION → ARCHITECTURE → GIT_INIT (new projects)
- `init-retrofit` - DETECT_EXISTING → CODE_MAP → CUSTOMIZE_CLAUDE → VISION → ARCHITECTURE → GIT_COMMIT (existing projects)
- `research` - PLAN → STUDY → ASSESS → QUESTIONS (external knowledge gathering)
- `discovery` - SPEC → PLAN → CODE → LEARNINGS → README (toy experiments)
- `execution` - Production-grade rigor with code review phase
- `refactor` - Focused refactoring workflow

**Starting at custom nodes:**
```bash
# Start at default beginning
hegel start discovery           # Starts at 'spec' node

# Start at specific node (skip earlier phases)
hegel start discovery plan      # Start directly at plan phase
hegel start execution code      # Start directly at code phase
```

**Custom start nodes are useful for:**
- Resuming interrupted workflows
- Testing specific workflow phases
- Skipping phases you've already completed manually

**What happens:**
- `hegel start` prints the first phase prompt with embedded guidance
- `hegel start <workflow> <node>` starts at specified node (validates node exists)
- `hegel next` advances and prints the next phase prompt - **follow these instructions**
- `hegel repeat` re-displays current prompt if you need to see it again
- `hegel restart` returns to SPEC phase (same workflow, fresh cycle)
- `hegel abort` abandons workflow entirely

**Guardrails:**
- Never abort an active workflow without explicit instruction from the user
- Invalid start node returns error with list of available nodes
- Prevents accidental loss of workflow progress

### Document Review

```bash
hegel reflect <file.md> [files...]      # Launch Markdown review GUI
hegel reflect <file.md> --out-dir <dir> # Custom output location
```

Reviews are returned via stdout when the user completes their review. Reviews are also saved to `.hegel/reviews.json` for recordkeeping.

### Metrics

```bash
hegel top               # Real-time TUI dashboard (4 tabs: Overview, Phases, Events, Files)
hegel analyze           # Static summary (tokens, activity, workflow graph, per-phase metrics)
```

Dashboard shortcuts: `q` (quit), `Tab` (switch tabs), `↑↓`/`j`/`k` (scroll), `g`/`G` (top/bottom), `r` (reload).

---

## Integration Patterns

### Session Start

```bash
hegel status            # Check active workflow
# If workflow active and relevant, continue with `hegel next`
```

### During Development

```bash
hegel top                           # Monitor metrics
```

### Advancing Workflow

**CRITICAL:** Do not run `hegel next` when there are unstaged changes, except:
- SPEC phase → commits defer to PLAN phase
- CODE_REVIEW phase (execution mode) → commits defer to README phase

```bash
hegel next              # Completed current phase (infers happy-path claim)
hegel restart           # Return to SPEC phase
```

### Document Review

```bash
hegel reflect SPEC.md
# User reviews in GUI, submits - feedback appears in stdout
```

---

## Best Practices

**DO:**
- ✅ Check `hegel status` at session start
- ✅ Before implementing code, check `hegel status` and suggest to the user that they start an appropriate workflow if none is active
- ✅ Always assume broken tests are caused by your changes - workflows never start with failing tests
- ✅ Read review files after `hegel reflect`
- ✅ Defer to `hegel <command> --help` for detailed syntax

**DON'T:**
- ❌ DON'T ignore workflow prompts (contain phase-specific guidance)
- ❌ DON'T reset workflow without user confirmation
- ❌ DON'T abort workflow without specific user guidance
- ❌ **NEVER run `hegel next` with unstaged changes** (except SPEC→PLAN and CODE_REVIEW→README where commits defer)
- ❌ **NEVER use `sed`, `awk`, or similar text stream editors to edit files** - they always cause issues. Use the Edit/Write tools instead

---

## Session Start Protocol

**At the beginning of every session:**

1. Run `hegel status` to check current workflow state
2. Report the status to the user
3. Recommend next action:
   - **No active workflow:** Suggest `hegel start cowboy` (default for most tasks)
   - **Active workflow completed (at done node):** Workflow is finished, suggest `hegel start cowboy` for new work
   - **Active workflow in progress:** Suggest `hegel repeat` to see current prompt
   - **User explicitly requests structured methodology:** Suggest appropriate DDD workflow (discovery/execution/research)

**Default recommendation:** `hegel start cowboy` unless context suggests otherwise.

