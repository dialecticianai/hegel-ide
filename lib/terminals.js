// Terminal creation, initialization, and IPC handling

(function(global) {
  'use strict';

  const { Terminal } = require('@xterm/xterm');
  const { FitAddon } = require('@xterm/addon-fit');
  const { ipcRenderer } = require('electron');

  function createTerminals() {
    return {
      terminals: {},
      nextTerminalNumber: 2,

      async addTerminalTab() {
        const terminalId = 'term-' + this.nextTerminalNumber;
        const tabId = terminalId;
        const label = 'Terminal ' + this.nextTerminalNumber;

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

          const container = document.getElementById('terminal-container-' + terminalId);
          if (container) {
            term.open(container);
            fitAddon.fit();

            this.terminals[terminalId] = { term, fitAddon };

            term.onData(data => {
              ipcRenderer.send('terminal-input', { terminalId, data });
            });

            const notifyResize = () => {
              const { cols, rows } = term;
              ipcRenderer.send('terminal-resize', { terminalId, cols, rows });
            };

            // Handle window resize
            window.addEventListener('resize', () => {
              fitAddon.fit();
              notifyResize();
            });

            notifyResize();
          }
        } catch (error) {
          console.error('Failed to create terminal:', error);
          this.rightTabs = this.rightTabs.filter(t => t.id !== tabId);
          this.activeRightTab = this.rightTabs[0].id;
        }
      }
    };
  }

  function initializeDefaultTerminal() {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const terminalId = 'term-1';

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

        const terminalContainer = document.getElementById('terminal-container-' + terminalId);
        if (terminalContainer) {
          term.open(terminalContainer);
          fitAddon.fit();

          const alpineData = Alpine.$data(document.getElementById('app'));
          if (alpineData) {
            alpineData.terminals[terminalId] = { term, fitAddon };
          }

          term.onData(data => {
            ipcRenderer.send('terminal-input', { terminalId, data });
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
        }
      }, 100);
    });

    ipcRenderer.on('terminal-output', (event, { terminalId, data }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      if (alpineData && alpineData.terminals[terminalId]) {
        alpineData.terminals[terminalId].term.write(data);
      }
    });
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createTerminals = createTerminals;
  global.HegelIDE.initializeDefaultTerminal = initializeDefaultTerminal;
})(window);
