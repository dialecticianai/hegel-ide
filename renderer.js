const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { ipcRenderer } = require('electron');

// Initialize terminal when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  // Create terminal instance
  const term = new Terminal({
    cursorBlink: true,
    theme: {
      background: '#000000',
      foreground: '#ffffff'
    }
  });

  // Create fit addon for auto-sizing
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  // Mount terminal to container
  const terminalContainer = document.getElementById('terminal-container');
  term.open(terminalContainer);

  // Fit terminal to container
  fitAddon.fit();

  // Send terminal input to main process
  term.onData(data => {
    ipcRenderer.send('terminal-input', data);
  });

  // Receive terminal output from main process
  ipcRenderer.on('terminal-output', (event, data) => {
    term.write(data);
  });

  // Notify main process of terminal resize
  const notifyResize = () => {
    const { cols, rows } = term;
    ipcRenderer.send('terminal-resize', { cols, rows });
  };

  // Resize terminal when window resizes
  window.addEventListener('resize', () => {
    fitAddon.fit();
    notifyResize();
  });

  // Initial resize notification
  notifyResize();
});
