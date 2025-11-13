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
      lastInteractedPane: 'right', // Track which pane was last clicked (default to right/terminal)

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
            const term = this.terminals[tab.terminalId].term;

            // Check if user was at bottom before fit
            const wasAtBottom = term.buffer.active.viewportY === term.buffer.active.baseY + term.rows - 1
                             || term.buffer.active.viewportY >= term.buffer.active.baseY + term.buffer.active.length - term.rows;

            this.terminals[tab.terminalId].fitAddon.fit();

            // Restore scroll to bottom if user was there before fit
            if (wasAtBottom) {
              term.scrollToBottom();
            }
          }, 0);
        }
      },

      // Handle keyboard shortcuts for tab switching (Cmd+1 through Cmd+9)
      handleTabShortcut(n) {
        // Check which pane currently contains DOM focus
        const focusedElement = document.activeElement;
        const inLeftPane = focusedElement.closest('.left-pane') !== null;
        const inRightPane = focusedElement.closest('.right-pane') !== null;

        // Use focus if available, otherwise use last interacted pane
        let targetPane = null;
        if (inLeftPane) {
          targetPane = 'left';
        } else if (inRightPane) {
          targetPane = 'right';
        } else {
          targetPane = this.lastInteractedPane;
        }

        if (targetPane === 'left' && this.leftTabs[n - 1]) {
          this.switchLeftTab(this.leftTabs[n - 1].id);
        } else if (targetPane === 'right' && this.rightTabs[n - 1]) {
          this.switchRightTab(this.rightTabs[n - 1].id);
        }
      },

      // Tab closing
      closeLeftTab(tabId, force = false) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || (!force && !tab.closeable)) return;

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
          closeable: false,
          filePath: absoluteFilePath,
          projectPath: projectPath,
          pendingComments: [],
          marginCollapsed: true,
          activeCommentForm: null
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

      // Review tab selection and commenting
      handleReviewSelection(tabId) {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        // Ignore empty selections
        if (!selectedText) {
          return;
        }

        // Find the containing markdown block
        const blockInfo = window.HegelIDE.findMarkdownBlock(selection.anchorNode);
        if (!blockInfo) {
          return;
        }

        // Show comment form for this block
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (tab && tab.type === 'review') {
          // Store active comment form state
          tab.activeCommentForm = {
            lineStart: blockInfo.lineStart,
            lineEnd: blockInfo.lineEnd,
            selectedText: selectedText,
            commentText: ''
          };

          // Auto-expand margin if collapsed
          if (tab.marginCollapsed) {
            tab.marginCollapsed = false;
          }
        }
      },

      addComment(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || tab.type !== 'review' || !tab.activeCommentForm) {
          return;
        }

        const form = tab.activeCommentForm;

        // Validate comment text
        if (!form.commentText || form.commentText.trim().length === 0) {
          return;
        }

        // Calculate next z-index (highest existing + 1)
        const maxZIndex = tab.pendingComments.reduce((max, c) => Math.max(max, c.zIndex || 0), 0);

        // Add to pending comments
        tab.pendingComments.push({
          lineStart: form.lineStart,
          lineEnd: form.lineEnd,
          selectedText: form.selectedText,
          comment: form.commentText.trim(),
          timestamp: new Date().toISOString(),
          zIndex: maxZIndex + 1
        });

        // Clear form
        tab.activeCommentForm = null;

        // Clear text selection
        window.getSelection().removeAllRanges();
      },

      cancelCommentForm(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (tab && tab.type === 'review') {
          tab.activeCommentForm = null;
          window.getSelection().removeAllRanges();
        }
      },

      bringCommentToFront(tabId, commentIndex) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || tab.type !== 'review') {
          return;
        }

        // Find max z-index
        const maxZIndex = tab.pendingComments.reduce((max, c) => Math.max(max, c.zIndex || 0), 0);

        // Set clicked comment's z-index to max + 1
        tab.pendingComments[commentIndex].zIndex = maxZIndex + 1;
      },

      getCommentsForBlock(tab, lineStart, lineEnd) {
        if (!tab || !tab.pendingComments) {
          return [];
        }

        // Return comments that overlap with this block's line range
        return tab.pendingComments.filter(comment =>
          comment.lineStart === lineStart && comment.lineEnd === lineEnd
        );
      },

      async submitReview(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || tab.type !== 'review' || tab.pendingComments.length === 0) {
          return;
        }

        try {
          // Format review data for hegel CLI
          const reviewData = {
            file: tab.filePath,
            projectPath: tab.projectPath,
            comments: tab.pendingComments.map(c => ({
              line_start: c.lineStart,
              line_end: c.lineEnd,
              selected_text: c.selectedText,
              comment: c.comment,
              timestamp: c.timestamp
            }))
          };

          // Call IPC handler (stubbed for MVP)
          const result = await ipcRenderer.invoke('save-review', reviewData);

          if (result.success) {
            // Clear pending comments
            tab.pendingComments = [];
            // Collapse margin
            tab.marginCollapsed = true;
            // Clear active form if present
            tab.activeCommentForm = null;
            // Close the review tab (force close even though closeable is false)
            this.closeLeftTab(tabId, true);
          } else {
            // Show error message (preserve comments)
            console.error('Failed to save review:', result.error);
            alert('Failed to save review: ' + (result.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error submitting review:', error);
          alert('Error submitting review: ' + error.message);
        }
      },

      async submitLGTM(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || tab.type !== 'review') {
          return;
        }

        // Clear any existing comments
        tab.pendingComments = [];

        // Add LGTM comment
        tab.pendingComments.push({
          lineStart: 1,
          lineEnd: 1,
          selectedText: '',
          comment: 'User says LGTM, no discussion needed.',
          timestamp: new Date().toISOString(),
          zIndex: 1
        });

        // Auto-submit
        await this.submitReview(tabId);
      },

      async submitNope(tabId) {
        const tab = this.leftTabs.find(t => t.id === tabId);
        if (!tab || tab.type !== 'review') {
          return;
        }

        // Clear any existing comments
        tab.pendingComments = [];

        // Add Nope comment
        tab.pendingComments.push({
          lineStart: 1,
          lineEnd: 1,
          selectedText: '',
          comment: 'User says more discussion is required.',
          timestamp: new Date().toISOString(),
          zIndex: 1
        });

        // Auto-submit
        await this.submitReview(tabId);
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

// Initialize IPC listener for opening review tabs from HTTP server
export function initializeReviewIPC() {
  ipcRenderer.on('open-review-tabs', (event, { files }) => {
    const alpineData = Alpine.$data(document.getElementById('app'));
    const projects = alpineData.projects || [];

    // For each file, find matching project and open review tab
    files.forEach(filePath => {
      let projectPath = null;

      // Find matching project
      for (const project of projects) {
        if (project.project_path && filePath.startsWith(project.project_path + '/')) {
          projectPath = project.project_path;
          break;
        }
      }

      // Open review tab with matched project path (or null)
      alpineData.openReviewTab(filePath, projectPath);
    });
  });
}

// Initialize keyboard shortcuts for tab switching
export function initializeTabShortcuts() {
  window.addEventListener('keydown', (event) => {
    // Check for Cmd (Mac) or Ctrl (Win/Linux) + number key (1-9)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

    if (modifierPressed && event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      const n = parseInt(event.key, 10);
      const alpineData = Alpine.$data(document.getElementById('app'));
      if (alpineData) {
        alpineData.handleTabShortcut(n);
      }
    }
  });
}
