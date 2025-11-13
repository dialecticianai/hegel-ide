// Utility IPC handlers

const { ipcMain } = require('electron');
const { terminalCwd } = require('../terminal.js');

function registerUtilHandlers(getMainWindow, getHttpPort) {
  // Handle toggle-devtools request
  ipcMain.handle('toggle-devtools', async () => {
    const mainWindow = getMainWindow();
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
    return { success: true };
  });

  // Handle get-terminal-cwd request
  ipcMain.handle('get-terminal-cwd', async () => {
    return { cwd: terminalCwd };
  });

  // Handle get-http-port request (for testing)
  ipcMain.handle('get-http-port', async () => {
    return getHttpPort();
  });
}

module.exports = { registerUtilHandlers };
