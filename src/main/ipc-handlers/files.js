// File-related IPC handlers

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function registerFileHandlers() {
  // Handle get-project-file request
  ipcMain.handle('get-project-file', async (event, { projectPath, fileName }) => {
    try {
      const filePath = path.join(projectPath, fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      return { content };
    } catch (error) {
      // All failures treated as missing file
      return { error: error.message };
    }
  });

  // Handle get-file-content request (absolute paths)
  ipcMain.handle('get-file-content', async (event, { filePath }) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { content };
    } catch (error) {
      // All failures treated as missing file
      return { error: error.message };
    }
  });
}

module.exports = { registerFileHandlers };
