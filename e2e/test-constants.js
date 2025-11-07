// Shared E2E test timeout constants
module.exports = {
  ALPINE_INIT: 300,        // Wait for Alpine.js to initialize
  TERMINAL_READY: 600,     // Wait for terminal to be ready for input
  TERMINAL_EXEC: 500,      // Wait for terminal command to execute
  TERMINAL_EXEC_FAST: 300, // Wait for fast terminal commands
  PROJECT_LOAD: 1500,      // Wait for projects list to load
  PROJECT_DETAIL: 2000,    // Wait for project details to load
  TAB_CREATE: 500,         // Wait for tab to be created
  TAB_CLOSE: 200,          // Wait for tab close animation
  SPLIT_PANE_INIT: 500,    // Wait for split-pane to initialize
  HEGEL_CMD: 2000,         // Wait for hegel command to execute
};
