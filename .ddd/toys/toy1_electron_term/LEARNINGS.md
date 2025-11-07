# Toy 1: Electron Shell + Alpine.js + Terminal – Learnings

Duration: ~1 hour | Status: Complete | Estimate: 1-2 hours

---

## Summary

**Built**: Electron app with Alpine.js reactivity and functional bash terminal via xterm.js + node-pty

**Worked**:
- Electron + Alpine.js integration seamless (CDN load, no build step)
- IPC terminal I/O clean and straightforward

**Failed**:
- Native module rebuild required (node-pty compiled for Node v20, Electron uses different NODE_MODULE_VERSION)
- Initial package choices deprecated (xterm, xterm-addon-fit → @xterm/xterm, @xterm/addon-fit)

**Uncertain**:
- Terminal feature completeness not validated (Ctrl+C, arrow keys for history, long output handling)
- No error handling for pty spawn failures or IPC disruption
- Performance characteristics unknown

---

## Evidence

### ✅ Validated

- **Alpine.js works in Electron renderer**: CDN script loads, x-data/x-text/@click directives function correctly with nodeIntegration enabled
- **xterm.js + node-pty viable**: Terminal renders, accepts input, displays bash output
- **IPC simple for this use case**: send/receive events sufficient, no complex preload script needed (contextIsolation: false acceptable for now)

### ⚠️ Challenged

- **Native module compilation**: node-pty requires `@electron/rebuild` to recompile for Electron's Node version
  - Error: `NODE_MODULE_VERSION 115` (Node v20) vs `NODE_MODULE_VERSION 140` (Electron's Node)
  - Fix: `npx electron-rebuild` after npm install
  - **Impact**: Any future native deps (e.g., SQLite, file watchers) will hit this

- **Package deprecation churn**: xterm packages moved to @xterm/* namespace
  - Had to switch mid-implementation
  - electron-rebuild → @electron/rebuild similar issue
  - **Impact**: Ecosystem still shifting, expect more deprecations

- **Security model shortcuts**: `nodeIntegration: true` + `contextIsolation: false` enables easy IPC but violates Electron security best practices
  - Acceptable for toy/internal tool
  - Production app should use preload scripts and contextBridge
  - **Deferred decision**: evaluate if this becomes a problem

### ❌ Failed

- **No validation beyond "it runs"**: Didn't test:
  - Ctrl+C process interruption (claimed in SPEC, not verified)
  - Command history with arrow keys
  - Multi-line output handling (cat large file)
  - Terminal resize behavior
  - Error states (pty spawn failure, bash crash)

### 🌀 Uncertain

- **Alpine.js at scale**: Works for counter button, unknown if sufficient for complex multi-project UI
- **Terminal performance**: No testing with long-running commands, streaming output, or large buffers
- **Cross-platform**: Only tested on macOS, Windows/Linux unknown

---

## Pivots

**None**: Implementation followed PLAN with no architectural changes.

---

## Impact

### Reusable Assets
- **Electron boilerplate**: main.js, package.json scripts, security settings established
- **IPC pattern**: Simple send/receive model works for terminal, likely sufficient for hegel CLI integration

### Architectural Consequences
- **Native module rebuild required**: Add `@electron/rebuild` to setup docs, run after every `npm install` that adds native deps
- **Security model deferred**: Accepted insecure IPC for now, must revisit if distributing externally
- **No build step yet**: Alpine via CDN works, but bundling may be needed for offline use or performance

### Recommendations for Future Toys
- **Test more thoroughly**: "App launches" is not sufficient validation
- **Handle errors explicitly**: No pty error handling, no IPC failure recovery
- **Evaluate Alpine limits early**: Before building complex UI, spike multi-component state management
- **Plan for rebuild**: Native deps will always require electron-rebuild, factor into setup time

### Estimate Calibration
- **Estimated**: 1-2 hours
- **Actual**: ~1 hour (including rebuild troubleshooting)
- **Assessment**: Accurate for foundation work, but validation gap means claimed features untested

---

## Open Questions

- Does Ctrl+C actually interrupt bash processes? (Claimed in SPEC, not verified)
- How does terminal perform with `cat LARGE_FILE` or `tail -f logfile`?
- Is Alpine.js sufficient for full multi-project dashboard, or will we need Vue/Svelte?
- Should we switch to secure IPC (preload + contextBridge) now or later?

---

## Notes

This toy established **technical feasibility**, not **feature completeness**.

Next toy should validate features claimed in specs, not just "does it run without errors."
