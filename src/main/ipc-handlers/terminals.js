// Terminal-related IPC handlers

const { ipcMain } = require('electron');
const { spawnTerminal, getPtyProcess, killPtyProcess } = require('../terminal.js');

function registerTerminalHandlers(getMainWindow, getHttpPort) {
  // Handle terminal input from renderer (route by terminalId)
  ipcMain.on('terminal-input', (event, { terminalId, data }) => {
    const ptyProc = getPtyProcess(terminalId);
    if (ptyProc) {
      ptyProc.write(data);
    }
  });

  // Handle terminal resize from renderer (route by terminalId)
  ipcMain.on('terminal-resize', (event, { terminalId, cols, rows }) => {
    const ptyProc = getPtyProcess(terminalId);
    if (ptyProc) {
      ptyProc.resize(cols, rows);
    }
  });

  // Handle create-terminal request
  ipcMain.handle('create-terminal', async (event, { terminalId }) => {
    try {
      const httpPort = getHttpPort();
      const mainWindow = getMainWindow();
      spawnTerminal(terminalId, httpPort, mainWindow);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle close-terminal request
  ipcMain.handle('close-terminal', async (event, { terminalId }) => {
    try {
      killPtyProcess(terminalId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerTerminalHandlers };
