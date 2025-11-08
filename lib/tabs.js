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
      }
    };
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createTabs = createTabs;
})(window);
