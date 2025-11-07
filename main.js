const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const pty = require('node-pty');
const os = require('os');

let mainWindow;
let ptyProcess;

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

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();

  // Spawn bash process
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
  ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env
  });

  // Forward bash output to renderer via IPC
  ptyProcess.onData((data) => {
    mainWindow.webContents.send('terminal-output', data);
  });

  // Handle terminal input from renderer
  ipcMain.on('terminal-input', (event, data) => {
    ptyProcess.write(data);
  });

  // Handle terminal resize from renderer
  ipcMain.on('terminal-resize', (event, { cols, rows }) => {
    ptyProcess.resize(cols, rows);
  });

  mainWindow.on('closed', function () {
    if (ptyProcess) {
      ptyProcess.kill();
    }
    mainWindow = null;
  });
}

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
