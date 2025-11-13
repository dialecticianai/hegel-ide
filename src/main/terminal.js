// Terminal/PTY management

const pty = require('node-pty');
const os = require('os');
const { execSync } = require('child_process');
const { buildTerminalEnv } = require('../../lib/terminal-env.js');

// Map of terminalId -> ptyProcess
const ptyProcesses = new Map();

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
function spawnTerminal(terminalId, httpPort, mainWindow) {
  const augmentedEnv = buildTerminalEnv(process.env, httpPort);
  const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

  const spawnOptions = {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: terminalCwd,
    env: augmentedEnv
  };

  // Enable flow control in production (helps reduce TUI flicker)
  // Disabled in tests as it may interfere with terminal I/O testing
  if (!process.env.TESTING) {
    spawnOptions.handleFlowControl = true;
  }

  const ptyProc = pty.spawn(shell, [], spawnOptions);

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

// Get a PTY process by terminal ID
function getPtyProcess(terminalId) {
  return ptyProcesses.get(terminalId);
}

// Kill a PTY process and remove from map
function killPtyProcess(terminalId) {
  const ptyProc = ptyProcesses.get(terminalId);
  if (ptyProc) {
    ptyProc.kill();
    ptyProcesses.delete(terminalId);
  }
}

// Kill all PTY processes
function killAllPtyProcesses() {
  for (const [_terminalId, ptyProc] of ptyProcesses) {
    ptyProc.kill();
  }
  ptyProcesses.clear();
}

module.exports = {
  terminalCwd,
  spawnTerminal,
  getPtyProcess,
  killPtyProcess,
  killAllPtyProcesses
};
