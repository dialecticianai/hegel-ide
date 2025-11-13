// Review-related IPC handlers

const { ipcMain } = require('electron');
const { runHegelCommand } = require('../hegel.js');
const { terminalCwd } = require('../terminal.js');

function registerReviewHandlers() {
  // Handle save-review request
  ipcMain.handle('save-review', async (event, reviewData) => {
    try {
      const { file, projectPath, comments } = reviewData;

      if (!comments || comments.length === 0) {
        return { success: false, error: 'No comments to save' };
      }

      // Convert comments to JSONL format expected by hegel
      const jsonl = comments.map(c => JSON.stringify({
        timestamp: c.timestamp,
        file: file,
        selection: {
          start: { line: c.line_start, col: 0 },
          end: { line: c.line_end, col: 0 }
        },
        text: c.selected_text,
        comment: c.comment
      })).join('\n') + '\n';

      // Use projectPath or fall back to terminalCwd
      const cwd = projectPath || terminalCwd;

      await runHegelCommand(['review', file], { stdin: jsonl, cwd });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerReviewHandlers };
