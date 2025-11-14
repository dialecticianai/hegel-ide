// Terminal creation, initialization, and IPC handling

const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { WebglAddon } = require('@xterm/addon-webgl');
const { ipcRenderer } = require('electron');

function setupTerminal(container, terminalId, terminalNumber, alpineDataGetter) {
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: '"DejaVuSansM Nerd Font Mono", "Courier New", Courier, monospace',
    smoothScrollDuration: 0,
    theme: {
      background: '#000000',
      foreground: '#ffffff'
    }
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  term.open(container);

  // Load WebGL renderer for better performance (disabled in tests)
  if (!process.env.TESTING) {
    try {
      term.loadAddon(new WebglAddon());
    } catch (e) {
      console.warn('WebGL addon failed, falling back to canvas renderer:', e);
    }
  }

  fitAddon.fit();

  term.onData(data => {
    ipcRenderer.send('terminal-input', { terminalId, data });
  });

  term.onTitleChange(title => {
    const alpineData = alpineDataGetter();
    if (alpineData) {
      const tab = alpineData.rightTabs.find(t => t.terminalId === terminalId);
      if (tab) {
        // Store custom title for fallback when no process is running
        tab.customTitle = title;
        tab.label = title ? `[${terminalNumber}] ${title}` : `Terminal ${terminalNumber}`;
      }
    }
  });

  const notifyResize = () => {
    const { cols, rows } = term;
    ipcRenderer.send('terminal-resize', { terminalId, cols, rows });
  };

  window.addEventListener('resize', () => {
    fitAddon.fit();
    notifyResize();
  });

  notifyResize();

  return { term, fitAddon };
}

export function createTerminals() {
    return {
      terminals: {},
      nextTerminalNumber: 2,

      sendMacro(terminalId, text) {
        if (this.terminals[terminalId]) {
          const term = this.terminals[terminalId].term;
          // Simulate typing the text, then pressing Enter
          // Must send separately - combining doesn't work in TUIs
          term.input(text, false);
          term.input('\r', false);  // \r simulates Enter key press
        }
      },

      async addTerminalTab() {
        const terminalNumber = this.nextTerminalNumber;
        const terminalId = 'term-' + terminalNumber;
        const tabId = terminalId;
        const label = 'Terminal ' + terminalNumber;

        this.nextTerminalNumber++;

        const newTab = {
          id: tabId,
          type: 'terminal',
          label: label,
          closeable: true,
          terminalId: terminalId
        };

        this.rightTabs.push(newTab);
        this.switchRightTab(tabId);

        try {
          await ipcRenderer.invoke('create-terminal', { terminalId });
          await this.$nextTick();

          const container = document.getElementById('terminal-container-' + terminalId);
          if (container) {
            this.terminals[terminalId] = setupTerminal(
              container,
              terminalId,
              terminalNumber,
              () => this
            );
            // Focus the newly created terminal
            this.terminals[terminalId].term.focus();
          }
        } catch (error) {
          console.error('Failed to create terminal:', error);
          this.rightTabs = this.rightTabs.filter(t => t.id !== tabId);
          this.activeRightTab = this.rightTabs[0].id;
        }
      }
    };
}

export function initializeDefaultTerminal() {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const terminalId = 'term-1';
        const terminalNumber = 1;

        const terminalContainer = document.getElementById('terminal-container-' + terminalId);
        if (terminalContainer) {
          const terminal = setupTerminal(
            terminalContainer,
            terminalId,
            terminalNumber,
            () => Alpine.$data(document.getElementById('app'))
          );

          const alpineData = Alpine.$data(document.getElementById('app'));
          if (alpineData) {
            alpineData.terminals[terminalId] = terminal;
          }
        }
      }, 100);
  });

  // Buffer for batching terminal output writes (reduces TUI flicker/scroll issues)
  const terminalBuffers = new Map(); // terminalId -> { data: string, timer: number }
  const BUFFER_INTERVAL_MS = 10;

  ipcRenderer.on('terminal-output', (event, { terminalId, data }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));
    if (alpineData && alpineData.terminals[terminalId]) {
      const term = alpineData.terminals[terminalId].term;

      // Get or create buffer for this terminal
      let buffer = terminalBuffers.get(terminalId);
      if (!buffer) {
        buffer = { data: '', timer: null };
        terminalBuffers.set(terminalId, buffer);
      }

      // Append incoming data to buffer
      buffer.data += data;

      // Clear existing timer if any
      if (buffer.timer !== null) {
        clearTimeout(buffer.timer);
      }

      // Schedule flush after 10ms
      buffer.timer = setTimeout(() => {
        term.write(buffer.data);
        buffer.data = '';
        buffer.timer = null;
      }, BUFFER_INTERVAL_MS);
    }
  });

  ipcRenderer.on('terminal-process-change', (event, { terminalId, processName }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));
    if (alpineData) {
      const tab = alpineData.rightTabs.find(t => t.terminalId === terminalId);
      if (tab) {
        // Extract terminal number from terminalId (e.g., 'term-1' -> '1')
        const terminalNumber = terminalId.split('-')[1];

        // Show process name if available
        if (processName) {
          tab.label = `[${terminalNumber}] ${processName}`;
        } else if (tab.customTitle) {
          // Fall back to custom title if we had one
          tab.label = `[${terminalNumber}] ${tab.customTitle}`;
        } else {
          tab.label = `Terminal ${terminalNumber}`;
        }
      }
    }
  });
}
