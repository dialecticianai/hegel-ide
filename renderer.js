const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { ipcRenderer } = require('electron');
const { marked } = require('marked');

// Alpine.js component for split-pane
document.addEventListener('alpine:init', () => {
  Alpine.data('splitPane', () => ({
    // State
    leftPanelPercent: 60,
    isDragging: false,
    projects: [],
    projectsLoading: true,
    projectsError: null,

    // Tab state
    leftTabs: [
      { id: 'projects', type: 'projects', label: 'Projects', closeable: false }
    ],
    activeLeftTab: 'projects',
    rightTabs: [
      { id: 'term-1', type: 'terminal', label: 'Terminal 1', closeable: false, terminalId: 'term-1' }
    ],
    activeRightTab: 'term-1',

    // Terminal and project tracking
    terminals: {},
    projectDetails: {},
    nextTerminalNumber: 2,

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

    // Tab methods
    switchLeftTab(tabId) {
      this.activeLeftTab = tabId;
    },

    switchRightTab(tabId) {
      this.activeRightTab = tabId;
      // Fit terminal when switching tabs
      const tab = this.rightTabs.find(t => t.id === tabId);
      if (tab && this.terminals[tab.terminalId]) {
        setTimeout(() => {
          this.terminals[tab.terminalId].fitAddon.fit();
        }, 0);
      }
    },

    closeLeftTab(tabId) {
      const tab = this.leftTabs.find(t => t.id === tabId);
      if (!tab || !tab.closeable) return;

      // Remove tab
      this.leftTabs = this.leftTabs.filter(t => t.id !== tabId);

      // Switch to first tab if closing active tab
      if (this.activeLeftTab === tabId) {
        this.activeLeftTab = this.leftTabs[0].id;
      }
    },

    closeRightTab(tabId) {
      const tab = this.rightTabs.find(t => t.id === tabId);
      if (!tab || !tab.closeable) return;

      // Clean up terminal
      if (this.terminals[tab.terminalId]) {
        this.terminals[tab.terminalId].term.dispose();
        delete this.terminals[tab.terminalId];
      }

      // Close terminal via IPC
      ipcRenderer.invoke('close-terminal', { terminalId: tab.terminalId });

      // Remove tab
      this.rightTabs = this.rightTabs.filter(t => t.id !== tabId);

      // Switch to first tab if closing active tab
      if (this.activeRightTab === tabId) {
        this.activeRightTab = this.rightTabs[0].id;
      }
    },

    openProjectTab(projectName) {
      // Check if tab already exists
      const existingTab = this.leftTabs.find(t => t.projectName === projectName);
      if (existingTab) {
        this.switchLeftTab(existingTab.id);
        return;
      }

      // Create new tab
      const tabId = 'project-' + projectName;
      const newTab = {
        id: tabId,
        type: 'project-detail',
        label: projectName,
        closeable: true,
        projectName: projectName
      };

      this.leftTabs.push(newTab);
      this.switchLeftTab(tabId);

      // Fetch project details if not cached
      if (!this.projectDetails[projectName]) {
        this.fetchProjectDetails(projectName).then(() => {
          this.fetchProjectReadme(projectName);
        });
      }
    },

    async fetchProjectDetails(projectName) {
      try {
        this.projectDetails[projectName] = {
          data: null,
          loading: true,
          error: null,
          readme: null,
          readmeError: null
        };

        const data = await ipcRenderer.invoke('get-project-details', { projectName });
        this.projectDetails[projectName] = {
          data: data,
          loading: false,
          error: null,
          readme: this.projectDetails[projectName]?.readme || null,
          readmeError: this.projectDetails[projectName]?.readmeError || null
        };
      } catch (error) {
        this.projectDetails[projectName] = {
          data: null,
          loading: false,
          error: error.message || 'Failed to load project details',
          readme: null,
          readmeError: null
        };
      }
    },

    async fetchProjectFile(projectName, fileName) {
      try {
        const projectData = this.projectDetails[projectName]?.data;
        if (!projectData || !projectData.project_path) {
          return null;
        }

        const result = await ipcRenderer.invoke('get-project-file', {
          projectPath: projectData.project_path,
          fileName: fileName
        });

        if (result.content) {
          return { content: result.content, error: null };
        } else {
          return { content: null, error: result.error };
        }
      } catch (error) {
        return { content: null, error: error.message };
      }
    },

    async fetchProjectReadme(projectName) {
      const result = await this.fetchProjectFile(projectName, 'README.md');
      if (result) {
        this.projectDetails[projectName].readme = result.content;
        this.projectDetails[projectName].readmeError = result.error;
      }
    },

    async refreshProjectDetails(projectName) {
      await this.fetchProjectDetails(projectName);
      await this.fetchProjectReadme(projectName);
    },

    async toggleDevTools() {
      try {
        await ipcRenderer.invoke('toggle-devtools');
      } catch (error) {
        console.error('Failed to toggle dev tools:', error);
      }
    },

    renderMarkdown(content) {
      if (!content) return '';
      return marked.parse(content);
    },

    async addTerminalTab() {
      const terminalId = 'term-' + this.nextTerminalNumber;
      const tabId = terminalId;
      const label = 'Terminal ' + this.nextTerminalNumber;

      this.nextTerminalNumber++;

      // Create tab
      const newTab = {
        id: tabId,
        type: 'terminal',
        label: label,
        closeable: true,
        terminalId: terminalId
      };

      this.rightTabs.push(newTab);
      this.switchRightTab(tabId);

      // Request pty creation
      try {
        await ipcRenderer.invoke('create-terminal', { terminalId });

        // Wait for DOM to update
        await this.$nextTick();

        // Create Terminal instance
        const term = new Terminal({
          cursorBlink: true,
          theme: {
            background: '#000000',
            foreground: '#ffffff'
          }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Mount terminal
        const container = document.getElementById('terminal-container-' + terminalId);
        if (container) {
          term.open(container);
          fitAddon.fit();

          // Store in map
          this.terminals[terminalId] = { term, fitAddon };

          // Set up IPC for this terminal
          term.onData(data => {
            ipcRenderer.send('terminal-input', { terminalId, data });
          });

          // Notify of resize
          const { cols, rows } = term;
          ipcRenderer.send('terminal-resize', { terminalId, cols, rows });
        }
      } catch (error) {
        console.error('Failed to create terminal:', error);
        // Remove tab if creation failed
        this.rightTabs = this.rightTabs.filter(t => t.id !== tabId);
        this.activeRightTab = this.rightTabs[0].id;
      }
    },

    addProjectTab() {
      // Placeholder - user needs to click a project to open a tab
      // This button won't do anything useful yet
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

// Initialize Terminal 1 when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  // Wait for Alpine to initialize
  setTimeout(() => {
    const terminalId = 'term-1';

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
    const terminalContainer = document.getElementById('terminal-container-' + terminalId);
    if (terminalContainer) {
      term.open(terminalContainer);

      // Fit terminal to container
      fitAddon.fit();

      // Store in Alpine's terminals map
      const alpineData = Alpine.$data(document.getElementById('app'));
      if (alpineData) {
        alpineData.terminals[terminalId] = { term, fitAddon };
      }

      // Send terminal input to main process
      term.onData(data => {
        ipcRenderer.send('terminal-input', { terminalId, data });
      });

      // Notify main process of terminal resize
      const notifyResize = () => {
        const { cols, rows } = term;
        ipcRenderer.send('terminal-resize', { terminalId, cols, rows });
      };

      // Resize terminal when window resizes
      window.addEventListener('resize', () => {
        fitAddon.fit();
        notifyResize();
      });

      // Initial resize notification
      notifyResize();
    }
  }, 100);
});

// Handle terminal output from all terminals
ipcRenderer.on('terminal-output', (event, { terminalId, data }) => {
  const alpineData = Alpine.$data(document.getElementById('app'));
  if (alpineData && alpineData.terminals[terminalId]) {
    alpineData.terminals[terminalId].term.write(data);
  }
});
