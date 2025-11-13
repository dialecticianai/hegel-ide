// Terminal creation, initialization, and IPC handling

const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { WebglAddon } = require('@xterm/addon-webgl');
const { ipcRenderer } = require('electron');

function setupTerminal(container, terminalId, terminalNumber, alpineDataGetter) {
  const term = new Terminal({
    cursorBlink: true,
    fontFamily: '"DejaVuSansM Nerd Font Mono", "Courier New", Courier, monospace',
    theme: {
      background: '#000000',
      foreground: '#ffffff'
    }
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);

  term.open(container);

  // Load WebGL renderer for better performance
  try {
    term.loadAddon(new WebglAddon());
  } catch (e) {
    console.warn('WebGL addon failed, falling back to canvas renderer:', e);
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
    // Check if user was at bottom before resize
    const wasAtBottom = term.buffer.active.viewportY === term.buffer.active.baseY + term.rows - 1
                     || term.buffer.active.viewportY >= term.buffer.active.baseY + term.buffer.active.length - term.rows;

    fitAddon.fit();
    notifyResize();

    // Restore scroll to bottom if user was there before resize
    if (wasAtBottom) {
      term.scrollToBottom();
    }
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

  ipcRenderer.on('terminal-output', (event, { terminalId, data }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));
    if (alpineData && alpineData.terminals[terminalId]) {
      const term = alpineData.terminals[terminalId].term;

      // Check if user is scrolled to the bottom before writing
      // buffer.baseY is the first visible row, buffer.viewportY is the viewport scroll position
      const beforeScroll = term.buffer.active.viewportY;
      const wasAtBottom = term.buffer.active.viewportY === term.buffer.active.baseY + term.rows - 1
                       || term.buffer.active.viewportY >= term.buffer.active.baseY + term.buffer.active.length - term.rows;

      term.write(data);

      const afterScroll = term.buffer.active.viewportY;

      // Debug: log if scroll position changed unexpectedly
      if (!wasAtBottom && afterScroll !== beforeScroll) {
        console.log('[Unexpected scroll]', {
          terminalId,
          beforeScroll,
          afterScroll,
          wasAtBottom,
          dataLength: data.length,
          baseY: term.buffer.active.baseY,
          bufferLength: term.buffer.active.length
        });
      }

      // If user was at the bottom, keep them there
      if (wasAtBottom) {
        term.scrollToBottom();
      }
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
