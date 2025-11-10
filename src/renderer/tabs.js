// Tab management for left and right panels

const { ipcRenderer } = require('electron');

export function createTabs() {
    return {
      // Tab state
      leftTabs: [
        { id: 'projects', type: 'projects', label: 'Projects', closeable: false }
      ],
      activeLeftTab: 'projects',
      rightTabs: [
        { id: 'term-1', type: 'terminal', label: 'Terminal 1', closeable: true, terminalId: 'term-1' }
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
          this.activeRightTab = this.rightTabs.length > 0 ? this.rightTabs[0].id : null;
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
            this.fetchMarkdownTree(projectName);
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
      openFileTab(absoluteFilePath, hash = null) {
        // Check if tab already exists showing this file
        const existingTab = this.leftTabs.find(t =>
          t.type === 'file' && t.filePath === absoluteFilePath
        );

        if (existingTab) {
          this.switchLeftTab(existingTab.id);
          if (hash) {
            this.scrollToHash(existingTab.id, hash);
          }
          return;
        }

        // Create new tab
        const fileName = absoluteFilePath.split('/').pop();
        const fileLabel = fileName.replace('.md', '');
        const tabId = `file-${absoluteFilePath.replace(/\//g, '-')}`;
        const newTab = {
          id: tabId,
          type: 'file',
          label: fileLabel,
          closeable: true,
          filePath: absoluteFilePath
        };

        this.leftTabs.push(newTab);
        this.switchLeftTab(tabId);

        // Fetch file content if not cached
        if (!this.fileContents[absoluteFilePath]) {
          this.fetchFileContent(absoluteFilePath).then(() => {
            if (hash) {
              this.scrollToHash(tabId, hash);
            }
          });
        } else if (hash) {
          this.scrollToHash(tabId, hash);
        }
      },

      // Review tab operations
      openReviewTab(absoluteFilePath, projectPath = null) {
        // Check if review tab already exists for this file
        const existingTab = this.leftTabs.find(t =>
          t.type === 'review' && t.filePath === absoluteFilePath
        );

        if (existingTab) {
          this.switchLeftTab(existingTab.id);
          return;
        }

        // Create new review tab
        const fileName = absoluteFilePath.split('/').pop();
        const fileLabel = fileName.replace('.md', '');
        const tabId = `review-${absoluteFilePath.replace(/\//g, '-')}`;
        const newTab = {
          id: tabId,
          type: 'review',
          label: fileLabel,
          closeable: true,
          filePath: absoluteFilePath,
          projectPath: projectPath,
          pendingComments: [],
          marginCollapsed: true
        };

        this.leftTabs.push(newTab);
        this.switchLeftTab(tabId);

        // Fetch file content if not cached
        if (!this.fileContents[absoluteFilePath]) {
          this.fetchFileContent(absoluteFilePath);
        }
      },

      toggleCommentMargin(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (tab && tab.type === 'review') {
          tab.marginCollapsed = !tab.marginCollapsed;
        }
      },

      async fetchFileContent(absoluteFilePath) {
        try {
          this.fileContents[absoluteFilePath] = {
            content: null,
            loading: true,
            error: null
          };

          const result = await this.fetchAbsoluteFile(absoluteFilePath);

          if (result) {
            this.fileContents[absoluteFilePath] = {
              content: result.content,
              loading: false,
              error: result.error
            };
          }
        } catch (error) {
          this.fileContents[absoluteFilePath] = {
            content: null,
            loading: false,
            error: error.message || 'Failed to load file'
          };
        }
      },

      async fetchAbsoluteFile(absoluteFilePath) {
        try {
          const result = await ipcRenderer.invoke('get-file-content', {
            filePath: absoluteFilePath
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

      getFileContent(absoluteFilePath) {
        return this.fileContents[absoluteFilePath];
      }
    };
}
