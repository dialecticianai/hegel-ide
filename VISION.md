# Hegel IDE Vision

An IDE where viewing code is a design flaw, not a feature.

---

## Problem Statement

Current AI-assisted IDEs (Cursor, Claude Code, GitHub Copilot) treat AI as a glorified autocomplete—a tool that helps humans write code faster. This fundamentally misunderstands the capability frontier we've crossed.

**The problem**: By keeping code visible and editable, these tools invite micro-management. Developers get stuck reviewing AI-generated implementation details instead of thinking at the problem level. The AI becomes a code monkey, and the human becomes a nitpicky code reviewer. Both are operating below their potential.

**The deeper issue**: Most developers assume current AI can't solve their hardest problems. They're wrong, but they won't discover this while trapped in "suggest code, review code, edit code" loops.

**The cost**: We're building AI-assisted development tools that preserve the old paradigm instead of unlocking the new one. Problems that could be solved through high-level orchestration remain unsolved because we're too busy staring at syntax.

---

## Target Users

**Primary**: AI-first enterprise systems engineers who have problems they assume current AI can't solve.

These are people who:
- Think in systems and abstractions, not lines of code
- Are willing to question whether they need to see implementation details
- Face genuinely hard problems (not CRUD apps)
- Value solving the problem over controlling every detail

**Not for**:
- Developers who need to see the code to trust it
- Junior engineers still learning programming concepts
- Projects where "I could code this faster myself" is actually true
- Anyone allergic to radical departures from traditional IDEs

---

## Solution Approach

**Core insight**: If you can't see the code, you can't micro-manage it. Forced abstraction is a feature.

**UI Layout**:
- **Right panel**: Integrated terminal running Claude Code (AI pair programming interface)
- **Left panel**: Markdown browser/viewer with no-code review system (document-driven workflow)

Work at the document and orchestration level. Code exists, you can run it and verify it works, but you don't stare at syntax.

**Key capabilities**:
- **Workflow orchestration** (via Hegel) - Work at the problem level, not the code level
- **Document-driven development** - SPEC.md, PLAN.md, ARCHITECTURE.md drive the workflow
- **No-code review system** - Review and annotate documents, not pull requests
- **Execution without inspection** - Run, test, verify outcomes; code is an implementation detail
- **First-principles problem decomposition** - Break down "impossible" problems into achievable workflows
- **AI as systems engineer, not code generator** - Orchestrate solutions, don't write functions

**What we're NOT doing**:
- ❌ Building a traditional code editor (no file tree + syntax highlighting for .py/.rs/.js files)
- ❌ Syntax highlighting, autocomplete, or traditional IDE features for code
- ❌ Making it easy to "peek" at implementation files during normal workflow
- ❌ Optimizing for problems current tools already solve

**What we ARE doing**:
- ✅ Terminal integration (for Claude Code interaction and command execution)
- ✅ Markdown viewing/browsing (for document-driven workflows)
- ✅ No-code review UI (annotate and approve documents, not code)
- ✅ Workflow state visualization (via Hegel backend)

---

## The Monastery and the Cathedral

Hegel IDE is **the cathedral**—the accessible entry point to Dialectic-Driven Development for the masses.

**The Monastery** (for terminal monks):
- **hegel-cli**: Pure Rust single-project CLI
- **hegel-pm**: Rust+warp+Sycamore multi-project manager (CLI + dashboard web UI)
- **hegel-mirror**: Ephemeral Rust+egui Markdown review tool (code-review style for .md files)

Lean, fast, powerful. For those who live in the terminal and love it.

**The Cathedral** (this project):
- **hegel-ide**: Electron-based, polished, with all the bells and whistles
- Leads people out of the IDE wastelands into the promised land of hegel-orchestrated no-code dialectics
- The pretty, accessible face of Dialectic-Driven Development

Might be a bit bloated compared to the monastery tools, but it's what most people need to make the leap from traditional IDEs to workflow-orchestrated development.

---

## Success Criteria

**We've succeeded when:**
- Users solve problems they previously thought AI couldn't handle
- The absence of a code editor feels like a relief, not a limitation
- Workflow orchestration becomes the natural interface for problem-solving
- First-time users experience the "wait, I don't actually need to see the code" realization

This isn't about market share or adoption metrics. It's about proving a point: AI-first development means working at a higher level of abstraction, and traditional code editors are training wheels we don't need anymore.

---

## Guiding Principles

**1. Abstraction over inspection**
If you're looking at code, you're working at the wrong level. Trust verification through execution, not manual review.

**2. First principles over convention**
Just because every IDE has a code editor doesn't mean yours should. Question assumptions.

**3. Ambitious problems over easy wins**
Target users who think their problems are too hard for current AI. Prove them wrong.

**4. Workflow orchestration over code generation**
The human orchestrates problem-solving workflows. The AI handles implementation details.

**5. "If NASA could figure it out, so can we"**
Hard problems are solvable with sufficient decomposition and determination. No excuses.

---

## Design Philosophy

Traditional IDEs evolved for human programmers writing code.
Hegel IDE is for humans orchestrating AI to solve problems.

The code is not the product. The working solution is.
