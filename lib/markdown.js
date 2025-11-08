// Markdown rendering and UI utilities

(function(global) {
  'use strict';

  const { ipcRenderer } = require('electron');
  const { marked } = require('marked');

  function createMarkdown() {
    return {
      renderMarkdown(content, projectName, filePath) {
        if (!content) return '';

        let html = marked.parse(content);

        // Transform relative image paths to absolute file:// URLs
        if (projectName && filePath) {
          const projectData = this.projectDetails?.[projectName]?.data;
          if (projectData?.project_path) {
            const projectPath = projectData.project_path;
            const fileDir = filePath.includes('/')
              ? filePath.substring(0, filePath.lastIndexOf('/'))
              : '';
            const basePath = fileDir ? `${projectPath}/${fileDir}` : projectPath;

            // Transform both <img src="..."> and markdown images
            html = html.replace(
              /(<img[^>]+src=["'])([^"':]+)(["'])/g,
              (match, prefix, src, suffix) => {
                // Skip absolute URLs (http://, https://, file://, data:)
                if (src.match(/^([a-z]+:|\/)/i)) {
                  return match;
                }
                // Convert relative path to file:// URL
                const absolutePath = `file://${basePath}/${src}`;
                return `${prefix}${absolutePath}${suffix}`;
              }
            );
          }
        }

        return html;
      },

      handleMarkdownClick(event, tabId, projectName) {
        // Check if clicked element is a link or inside a link
        let target = event.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
          if (!target || target === event.currentTarget) return;
        }

        const href = target.getAttribute('href');
        if (!href) return;

        // Always prevent default navigation
        event.preventDefault();

        // Handle external links (http://, https://, mailto:, etc.)
        if (href.match(/^[a-z]+:/i)) {
          // Open in system browser
          const { shell } = require('electron');
          shell.openExternal(href);
          return;
        }

        // Only handle markdown files for internal navigation
        if (!href.match(/\.md(#.*)?$/i)) return;

        // Extract file path and hash
        const [filePath, ...hashParts] = href.split('#');
        const hash = hashParts.length > 0 ? hashParts.join('#') : null;

        // Determine if we should open in a new tab based on modifier keys
        const openInNewTab = event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1;

        if (openInNewTab) {
          // Just open the new file in a new tab
          this.openFileTab(projectName, filePath, hash);
        } else {
          // Navigate: open new file at current tab position, then close current tab
          const targetTabId = `file-${projectName}-${filePath.replace(/\//g, '-')}`;
          const existingTab = this.leftTabs.find(t => t.id === targetTabId);

          if (existingTab) {
            // File already open, just switch to it and close current tab
            this.switchLeftTab(existingTab.id);
            this.closeLeftTab(tabId);
            if (hash) {
              this.scrollToHash(existingTab.id, hash);
            }
          } else {
            // Find position of current tab
            const currentIndex = this.leftTabs.findIndex(t => t.id === tabId);

            // Create new tab at same position
            const fileName = filePath.split('/').pop();
            const fileLabel = fileName.replace('.md', '');
            const newTab = {
              id: targetTabId,
              type: 'file',
              label: fileLabel,
              closeable: true,
              projectName: projectName,
              filePath: filePath
            };

            this.leftTabs.splice(currentIndex, 0, newTab);
            this.switchLeftTab(targetTabId);

            // Fetch file content
            const fileKey = `${projectName}:${filePath}`;
            if (!this.fileContents[fileKey]) {
              this.fetchFileContent(projectName, filePath).then(() => {
                if (hash) {
                  this.scrollToHash(targetTabId, hash);
                }
              });
            } else if (hash) {
              this.scrollToHash(targetTabId, hash);
            }

            // Close old tab (now at currentIndex + 1)
            this.closeLeftTab(tabId);
          }
        }
      },

      async toggleDevTools() {
        try {
          await ipcRenderer.invoke('toggle-devtools');
        } catch (error) {
          console.error('Failed to toggle dev tools:', error);
        }
      }
    };
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createMarkdown = createMarkdown;
})(window);
