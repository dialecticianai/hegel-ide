const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { ipcRenderer } = require('electron');

// Alpine.js component for split-pane
document.addEventListener('alpine:init', () => {
  Alpine.data('splitPane', () => ({
    // State
    leftPanelPercent: 60,
    isDragging: false,
    projects: [],
    projectsLoading: true,
    projectsError: null,

    // Initialize component
    init() {
      // Load saved split position from localStorage
      const saved = localStorage.getItem('hegel-ide:split-position');
      if (saved) {
        try {
          const { leftPanelPercent } = JSON.parse(saved);
          if (leftPanelPercent >= 20 && leftPanelPercent <= 80) {
            this.leftPanelPercent = leftPanelPercent;
          }
        } catch (e) {
          console.warn('Failed to parse saved split position:', e);
        }
      }

      // Load projects from hegel CLI
      this.loadProjects();
    },

    // Load discovered projects
    async loadProjects() {
      try {
        this.projectsLoading = true;
        this.projectsError = null;

        // Request projects via IPC
        const projects = await ipcRenderer.invoke('get-projects');
        this.projects = projects;
        this.projectsLoading = false;
      } catch (error) {
        this.projectsError = error.message || 'Failed to load projects';
        this.projectsLoading = false;
      }
    },

    // Drag handlers
    startDrag(event) {
      this.isDragging = true;
      const containerWidth = event.target.parentElement.offsetWidth;

      const handleMouseMove = (e) => {
        if (!this.isDragging) return;

        // Calculate new split position as percentage
        const newPercent = (e.clientX / containerWidth) * 100;

        // Clamp between 20% and 80%
        this.leftPanelPercent = Math.max(20, Math.min(80, newPercent));
      };

      const handleMouseUp = () => {
        if (this.isDragging) {
          this.isDragging = false;

          // Save to localStorage
          localStorage.setItem('hegel-ide:split-position', JSON.stringify({
            leftPanelPercent: this.leftPanelPercent
          }));

          // Clean up listeners
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  }));
});

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
