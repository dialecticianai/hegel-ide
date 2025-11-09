const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const pty = require('node-pty');
const os = require('os');
const { spawn } = require('child_process');
const fs = require('fs').promises;

let mainWindow;
let ptyProcesses = new Map(); // Map of terminalId -> ptyProcess

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Spawn initial terminal (term-1)
  const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
  const term1 = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env
  });

  ptyProcesses.set('term-1', term1);

  // Forward bash output to renderer via IPC (with terminalId)
  term1.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', { terminalId: 'term-1', data });
    }
  });

  // Handle terminal input from renderer (route by terminalId)
  ipcMain.on('terminal-input', (event, { terminalId, data }) => {
    const ptyProc = ptyProcesses.get(terminalId);
    if (ptyProc) {
      ptyProc.write(data);
    }
  });

  // Handle terminal resize from renderer (route by terminalId)
  ipcMain.on('terminal-resize', (event, { terminalId, cols, rows }) => {
    const ptyProc = ptyProcesses.get(terminalId);
    if (ptyProc) {
      ptyProc.resize(cols, rows);
    }
  });

  // Handle project discovery request
  ipcMain.handle('get-projects', async () => {
    return new Promise((resolve, reject) => {
      const hegel = spawn('hegel', ['pm', 'discover', 'list', '--json']);
      let stdout = '';
      let stderr = '';

      hegel.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      hegel.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      hegel.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`hegel command failed: ${stderr}`));
          return;
        }

        try {
          const output = JSON.parse(stdout);
          const projectNames = output.projects.map(p => p.name);
          resolve(projectNames);
        } catch (error) {
          reject(new Error(`Failed to parse hegel output: ${error.message}`));
        }
      });

      hegel.on('error', (error) => {
        reject(new Error(`Failed to spawn hegel: ${error.message}`));
      });
    });
  });

  // Handle project detail request
  ipcMain.handle('get-project-details', async (event, { projectName }) => {
    return new Promise((resolve, reject) => {
      const hegel = spawn('hegel', ['pm', 'discover', 'show', projectName, '--json']);
      let stdout = '';
      let stderr = '';

      hegel.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      hegel.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      hegel.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`hegel command failed: ${stderr}`));
          return;
        }

        try {
          const output = JSON.parse(stdout);
          resolve(output);
        } catch (error) {
          reject(new Error(`Failed to parse hegel output: ${error.message}`));
        }
      });

      hegel.on('error', (error) => {
        reject(new Error(`Failed to spawn hegel: ${error.message}`));
      });
    });
  });

  // Handle create-terminal request
  ipcMain.handle('create-terminal', async (event, { terminalId }) => {
    try {
      const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
      const ptyProc = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env
      });

      ptyProcesses.set(terminalId, ptyProc);

      // Forward output to renderer
      ptyProc.onData((data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal-output', { terminalId, data });
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle close-terminal request
  ipcMain.handle('close-terminal', async (event, { terminalId }) => {
    try {
      const ptyProc = ptyProcesses.get(terminalId);
      if (ptyProc) {
        ptyProc.kill();
        ptyProcesses.delete(terminalId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle toggle-devtools request
  ipcMain.handle('toggle-devtools', async () => {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools();
    }
    return { success: true };
  });

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

  mainWindow.on('closed', function () {
    // Kill all pty processes
    for (const [terminalId, ptyProc] of ptyProcesses) {
      ptyProc.kill();
    }
    ptyProcesses.clear();
    mainWindow = null;
  });
}

// Confirm before quitting
app.on('before-quit', (event) => {
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    buttons: ['Quit', 'Cancel'],
    title: 'Confirm Quit',
    message: 'Are you sure you want to quit Hegel IDE?',
    defaultId: 1, // Cancel is default
    cancelId: 1
  });

  if (choice === 1) { // Cancel
    event.preventDefault();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
