// Tab management for left and right panels

(function(global) {
  'use strict';

  const { ipcRenderer } = require('electron');

  function createTabs() {
    return {
      // Tab state
      leftTabs: [
        { id: 'projects', type: 'projects', label: 'Projects', closeable: false }
      ],
      activeLeftTab: 'projects',
      rightTabs: [
        { id: 'term-1', type: 'terminal', label: 'Terminal 1', closeable: false, terminalId: 'term-1' }
      ],
      activeRightTab: 'term-1',
      fileContents: {}, // Store file contents by key: projectName:filePath

      // Tab switching
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

      // Tab closing
      closeLeftTab(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || !tab.closeable) return;

        this.leftTabs = this.leftTabs.filter(t => t.id !== tabId);

        if (this.activeLeftTab === tabId) {
          this.activeLeftTab = this.leftTabs[0].id;
        }
      },

      closeRightTab(tabId) {
        const tab = this.rightTabs.find(t => t.id === tabId);
        if (!tab || !tab.closeable) return;

        if (this.terminals[tab.terminalId]) {
          this.terminals[tab.terminalId].term.dispose();
          delete this.terminals[tab.terminalId];
        }

        ipcRenderer.invoke('close-terminal', { terminalId: tab.terminalId });

        this.rightTabs = this.rightTabs.filter(t => t.id !== tabId);

        if (this.activeRightTab === tabId) {
          this.activeRightTab = this.rightTabs[0].id;
        }
      },

      // Project tab operations
      openProjectTab(projectName) {
        const existingTab = this.leftTabs.find(t => t.projectName === projectName);
        if (existingTab) {
          this.switchLeftTab(existingTab.id);
          return;
        }

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

        if (!this.projectDetails[projectName]) {
          this.fetchProjectDetails(projectName).then(() => {
            this.fetchProjectReadme(projectName);
          });
        }
      },

      addProjectTab() {
        // Placeholder
      },

      // Settings tab operations
      openSettingsTab() {
        const existingTab = this.leftTabs.find(t => t.id === 'settings');
        if (existingTab) {
          this.switchLeftTab('settings');
          return;
        }

        const newTab = {
          id: 'settings',
          type: 'settings',
          label: 'Settings',
          closeable: true
        };

        // Always insert at index 1 (right after Projects at index 0)
        this.leftTabs.splice(1, 0, newTab);
        this.switchLeftTab('settings');
      },

      // File tab operations
      openFileTab(projectName, filePath, hash = null) {
        const fileKey = `${projectName}:${filePath}`;

        // Check if tab already exists showing this file
        const existingTab = this.leftTabs.find(t =>
          t.projectName === projectName && t.filePath === filePath
        );

        if (existingTab) {
          this.switchLeftTab(existingTab.id);
          if (hash) {
            this.scrollToHash(existingTab.id, hash);
          }
          return;
        }

        // Create new tab
        const fileName = filePath.split('/').pop();
        const fileLabel = fileName.replace('.md', '');
        const tabId = `file-${projectName}-${filePath.replace(/\//g, '-')}`;
        const newTab = {
          id: tabId,
          type: 'file',
          label: fileLabel,
          closeable: true,
          projectName: projectName,
          filePath: filePath
        };

        this.leftTabs.push(newTab);
        this.switchLeftTab(tabId);

        // Fetch file content if not cached
        if (!this.fileContents[fileKey]) {
          this.fetchFileContent(projectName, filePath).then(() => {
            if (hash) {
              this.scrollToHash(tabId, hash);
            }
          });
        } else if (hash) {
          this.scrollToHash(tabId, hash);
        }
      },

      async fetchFileContent(projectName, filePath) {
        const fileKey = `${projectName}:${filePath}`;

        try {
          this.fileContents[fileKey] = {
            content: null,
            loading: true,
            error: null
          };

          const result = await this.fetchProjectFile(projectName, filePath);

          if (result) {
            this.fileContents[fileKey] = {
              content: result.content,
              loading: false,
              error: result.error
            };
          }
        } catch (error) {
          this.fileContents[fileKey] = {
            content: null,
            loading: false,
            error: error.message || 'Failed to load file'
          };
        }
      },

      scrollToHash(tabId, hash) {
        // Wait for Alpine to render the content
        this.$nextTick(() => {
          setTimeout(() => {
            const element = document.getElementById(hash);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        });
      },

      getFileContent(projectName, filePath) {
        const fileKey = `${projectName}:${filePath}`;
        return this.fileContents[fileKey];
      }
    };
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createTabs = createTabs;
})(window);
