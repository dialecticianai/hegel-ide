const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const pty = require('node-pty');
const os = require('os');
const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const http = require('http');
const { buildTerminalEnv } = require('../lib/terminal-env.js');
const { parseReviewRequest, checkFilesExist } = require('../lib/http-server.js');

let mainWindow;
let ptyProcesses = new Map(); // Map of terminalId -> ptyProcess
let httpServer;
let httpPort;

// Use HEGEL_IDE_CWD env var if set, otherwise use process.cwd()
const terminalCwd = process.env.HEGEL_IDE_CWD || process.cwd();

// Get foreground process for a PTY
function getForegroundProcess(pid) {
  try {
    if (os.platform() === 'darwin' || os.platform() === 'linux') {
      // Use pgrep to efficiently find direct children
      // -P <pid> finds children of specific parent
      const childPids = execSync(`pgrep -P ${pid}`, { encoding: 'utf-8' }).trim();

      if (!childPids) {
        // No children, shell is idle
        return null;
      }

      // Get the first child PID (foreground process)
      const firstChildPid = childPids.split('\n')[0];

      // Get the process name for this PID
      const psOutput = execSync(`ps -o comm= -p ${firstChildPid}`, { encoding: 'utf-8' }).trim();

      let processName = psOutput;

      // Strip path to get just the program name (e.g., /bin/zsh -> zsh)
      if (processName && processName.includes('/')) {
        processName = processName.split('/').pop();
      }

      return processName;
    }
  } catch (error) {
    // Silently fail - process may have exited or no children
    return null;
  }
  return null;
}

// Unified terminal spawn function
function spawnTerminal(terminalId, httpPort) {
  const augmentedEnv = buildTerminalEnv(process.env, httpPort);
  const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

  const ptyProc = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: terminalCwd,
    env: augmentedEnv,
    handleFlowControl: true
  });

  ptyProc.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-output', { terminalId, data });

      // Check if foreground process changed (event-driven, not polling)
      const currentProcess = getForegroundProcess(ptyProc.pid);
      if (currentProcess !== ptyProc._lastProcess) {
        ptyProc._lastProcess = currentProcess;
        mainWindow.webContents.send('terminal-process-change', {
          terminalId,
          processName: currentProcess
        });
      }
    }
  });

  ptyProcesses.set(terminalId, ptyProc);
  return ptyProc;
}

// HTTP request handler
async function handleRequest(req, res) {
  // Only accept POST to /review
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (req.url !== '/review') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Collect request body
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      // Parse and validate request
      const { files } = parseReviewRequest(body);

      // Check if all files exist
      const validation = await checkFilesExist(files);
      if (!validation.valid) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ missing: validation.missing }));
        return;
      }

      // Send to renderer to open review tabs
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('open-review-tabs', { files });
      }

      // Return success
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      // Determine status code based on error type
      let statusCode = 500;

      // JSON parse errors and validation errors are 400
      if (error instanceof SyntaxError ||
          error.message.includes('required field') ||
          error.message.includes('must be') ||
          error.message.includes('cannot be empty')) {
        statusCode = 400;
      }

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: !process.env.TESTING, // Hide window during tests
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('dist/index.html');

  // Spawn initial terminal (term-1)
  spawnTerminal('term-1', httpPort);

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
          resolve(output.projects);
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

  // Handle markdown tree request
  ipcMain.handle('get-markdown-tree', async (event, { projectPath }) => {
    return new Promise((resolve, reject) => {
      const hegel = spawn('hegel', ['md', '--no-ddd', '--json', '--state-dir', projectPath]);
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
      spawnTerminal(terminalId, httpPort);
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
      })).join('\n');

      // Use projectPath or fall back to terminalCwd
      const cwd = projectPath || terminalCwd;

      // Spawn hegel review process
      return new Promise((resolve, reject) => {
        const hegelProcess = spawn('hegel', ['review', file], {
          cwd: cwd,
          env: process.env
        });

        let stdout = '';
        let stderr = '';

        hegelProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        hegelProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        hegelProcess.on('error', (error) => {
          resolve({ success: false, error: `Failed to spawn hegel: ${error.message}` });
        });

        hegelProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: stderr || `hegel review exited with code ${code}` });
          }
        });

        // Write JSONL to stdin and close
        hegelProcess.stdin.write(jsonl + '\n');
        hegelProcess.stdin.end();
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle get-terminal-cwd request
  ipcMain.handle('get-terminal-cwd', async () => {
    return { cwd: terminalCwd };
  });

  // Handle get-http-port request (for testing)
  ipcMain.handle('get-http-port', async () => {
    return httpPort;
  });

  mainWindow.on('closed', function () {
    // Kill all pty processes
    for (const [_terminalId, ptyProc] of ptyProcesses) {
      ptyProc.kill();
    }
    ptyProcesses.clear();
    mainWindow = null;
  });
}

// Confirm before quitting (skip in test environment)
app.on('before-quit', (event) => {
  if (process.env.TESTING) {
    return; // Skip confirmation during tests
  }

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

app.whenReady().then(() => {
  // Create HTTP server before window
  httpServer = http.createServer(handleRequest);
  httpServer.listen(0, 'localhost', () => {
    httpPort = httpServer.address().port;
    createWindow();
  });
});

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

app.on('quit', function () {
  if (httpServer) {
    httpServer.close();
  }
});
