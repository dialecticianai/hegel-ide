// Main orchestration layer - coordinates all modules

const { app, dialog } = require('electron');
const { createWindow, getMainWindow, setMainWindow } = require('./window.js');
const { createHttpServer, getHttpPort, closeHttpServer } = require('./http-server.js');
const { spawnTerminal, killAllPtyProcesses } = require('./terminal.js');
const { registerProjectHandlers } = require('./ipc-handlers/projects.js');
const { registerTerminalHandlers } = require('./ipc-handlers/terminals.js');
const { registerFileHandlers } = require('./ipc-handlers/files.js');
const { registerReviewHandlers } = require('./ipc-handlers/reviews.js');
const { registerUtilHandlers } = require('./ipc-handlers/utils.js');

// Initialize app
async function initialize() {
  // Create window
  const mainWindow = createWindow();

  // Create HTTP server before spawning terminal
  const httpPort = await createHttpServer(mainWindow);

  // Spawn initial terminal (term-1)
  spawnTerminal('term-1', httpPort, mainWindow);

  // Register all IPC handlers
  registerProjectHandlers();
  registerTerminalHandlers(getMainWindow, getHttpPort);
  registerFileHandlers();
  registerReviewHandlers();
  registerUtilHandlers(getMainWindow, getHttpPort);

  // Handle window close
  mainWindow.on('closed', function () {
    killAllPtyProcesses();
    setMainWindow(null);
  });

  return mainWindow;
}

// Confirm before quitting (skip in test environment)
app.on('before-quit', (event) => {
  if (process.env.TESTING) {
    return; // Skip confirmation during tests
  }

  const mainWindow = getMainWindow();
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

// App lifecycle
app.whenReady().then(initialize);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (getMainWindow() === null) {
    initialize();
  }
});

app.on('quit', function () {
  closeHttpServer();
});

module.exports = { initialize };
