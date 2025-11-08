# Hegel IDE Project

This project is **hegel-ide**, a subproject of the Hegel ecosystem. See [README.md](./README.md) for project-specific details.

**What is hegel-ide?** An Electron-based no-code IDE for AI-first development. No code editor by design - work at the orchestration level.

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

### Meta-Modes & Workflows

```bash
hegel meta <learning|standard>  # Declare meta-mode (optional)
hegel meta                      # View current meta-mode

hegel start <workflow> [node]   # Load workflow (optionally at specific node)
hegel status                    # Show current state
hegel next                      # Advance to next phase (auto-infers completion claim)
hegel restart                   # Return to SPEC phase (restart cycle, keep same workflow)
hegel repeat                    # Re-display current prompt
hegel abort                     # Abandon workflow entirely (required before starting new one)
hegel reset                     # Clear all state
```

**Meta-modes:**
- `learning` - Research ↔ Discovery loop (starts with research)
- `standard` - Discovery ↔ Execution (starts with discovery)

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
- `hegel abort` abandons workflow entirely (required before starting different workflow)

**Guardrails:**
- Cannot start new workflow while one is active → run `hegel abort` first
- Invalid start node returns error with list of available nodes
- Prevents accidental loss of workflow progress

### Document Review

```bash
hegel reflect <file.md> [files...]      # Launch Markdown review GUI
hegel reflect <file.md> --out-dir <dir> # Custom output location
```

Reviews saved to `.ddd/<filename>.review.N` (JSONL format). Read with `cat .ddd/SPEC.review.1 | jq -r '.comment'`.

### Metrics

```bash
hegel top               # Real-time TUI dashboard (4 tabs: Overview, Phases, Events, Files)
hegel analyze           # Static summary (tokens, activity, workflow graph, per-phase metrics)
hegel hook <event>      # Process Claude Code hook events (stdin JSON)
```

Dashboard shortcuts: `q` (quit), `Tab` (switch tabs), `↑↓`/`j`/`k` (scroll), `g`/`G` (top/bottom), `r` (reload).

---

## Workflow Selection Guide

**Cowboy mode (default):** Use for most tasks. Just LEXICON guidance without ceremony - tongue-in-cheek acknowledgement that full DDD is overkill for straightforward work.

**When to use full DDD workflows:**
- Hard problems requiring novel solutions
- Complex domains where mistakes are expensive
- Learning-dense exploration
- User explicitly requests structured methodology

**Starting cowboy mode:**
```bash
hegel start cowboy
```

**When in doubt:** Start with cowboy. Escalate to discovery/execution only when complexity demands it.

---

## Integration Patterns

### Session Start

```bash
hegel meta              # Check meta-mode
hegel status            # Check active workflow
# If workflow active and relevant, continue with `hegel next`
# If user requests structure but no workflow, run `hegel meta <mode>`
```

### During Development

```bash
hegel top                           # Monitor metrics
```

### Advancing Workflow

```bash
hegel next              # Completed current phase (infers happy-path claim)
hegel restart           # Return to SPEC phase
hegel abort             # Abandon workflow entirely
```

### Document Review

```bash
hegel reflect SPEC.md
# User reviews in GUI, submits
cat .ddd/SPEC.review.1 | jq -r '.comment'  # Read feedback
```

---

## State Files

```
.hegel/
├── state.json          # Current workflow (def, node, history, session metadata)
├── metamode.json       # Meta-mode declaration
├── config.toml         # User configuration
├── hooks.jsonl         # Claude Code events (tool usage, file mods, timestamps)
└── states.jsonl        # Workflow transitions (from/to, mode, workflow_id)
```

**JSONL format:** One JSON object per line (newline-delimited)
**Atomicity:** `state.json` uses atomic writes (write temp, rename)
**Correlation:** `workflow_id` (ISO 8601 timestamp) links hooks/states/transcripts

---

## Error Handling

| Error | Solution |
|-------|----------|
| "No workflow loaded" | `hegel start <workflow>` |
| "Cannot start workflow while one is active" | `hegel abort` then `hegel start <workflow>` |
| "Stayed at current node" (unexpected) | Check `hegel status`, verify not at terminal node, use `hegel restart` |

---

## Best Practices

**DO:**
- ✅ Check `hegel status` at session start
- ✅ Read review files after `hegel reflect`
- ✅ Defer to `hegel <command> --help` for detailed syntax

**DON'T:**
- ❌ DON'T start workflow if user hasn't requested structure
- ❌ DON'T ignore workflow prompts (contain phase-specific guidance)
- ❌ DON'T reset workflow without user confirmation
- ❌ DON'T abort workflow without specific user guidance
- ❌ **NEVER use `sed`, `awk`, or similar text stream editors to edit files** - they always cause issues. Use the Edit/Write tools instead

---

## Quick Reference

```bash
# Initialization
hegel init
hegel config list|get|set <key> [<value>]

# Meta-mode (required before workflows)
hegel meta <learning|standard>
hegel meta

# Workflows
hegel start <cowboy|discovery|execution|research|refactor>
hegel next|restart|abort|repeat|status|reset

# Review
hegel reflect <files...>

# Metrics
hegel top
hegel analyze
```

---

**For detailed command syntax, always use:** `hegel <command> --help`

---

## Session Start Protocol

**At the beginning of every session:**

1. Run `hegel status` to check current workflow state
2. Report the status to the user
3. Recommend next action:
   - **No active workflow:** Suggest `hegel start cowboy` (default for most tasks)
   - **Active workflow completed (at done node):** Workflow is finished, suggest `hegel start cowboy` for new work
   - **Active workflow in progress:** Suggest `hegel repeat` to see current prompt, or `hegel abort` if starting fresh work
   - **User explicitly requests structured methodology:** Suggest appropriate DDD workflow (discovery/execution/research)

**Default recommendation:** `hegel start cowboy` unless context suggests otherwise.

