// Markdown rendering and UI utilities

const { ipcRenderer } = require('electron');
const { marked } = require('marked');

export function createMarkdown() {
    return {
      renderMarkdown(content, absoluteFilePath = null) {
        if (!content) return '';

        let html = marked.parse(content);

        // Transform relative image paths to absolute file:// URLs
        if (absoluteFilePath) {
          // Get the directory of the current file
          const fileDir = absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('/'));

          // Transform both <img src="..."> and markdown images
          html = html.replace(
            /(<img[^>]+src=["'])([^"':]+)(["'])/g,
            (match, prefix, src, suffix) => {
              // Skip absolute URLs (http://, https://, file://, data:)
              if (src.match(/^([a-z]+:|\/)/i)) {
                return match;
              }
              // Convert relative path to file:// URL
              const absolutePath = `file://${fileDir}/${src}`;
              return `${prefix}${absolutePath}${suffix}`;
            }
          );
        }

        return html;
      },

      handleMarkdownClick(event, tabId) {
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
        const [relativeFilePath, ...hashParts] = href.split('#');
        const hash = hashParts.length > 0 ? hashParts.join('#') : null;

        // Get current tab to resolve relative path
        const currentTab = this.leftTabs.find(t => t.id === tabId);
        if (!currentTab || !currentTab.filePath) return;

        // Resolve relative path to absolute path
        const currentFileDir = currentTab.filePath.substring(0, currentTab.filePath.lastIndexOf('/'));
        const absoluteFilePath = `${currentFileDir}/${relativeFilePath}`;

        // Determine if we should open in a new tab based on modifier keys
        const openInNewTab = event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1;

        if (openInNewTab) {
          // Just open the new file in a new tab
          this.openFileTab(absoluteFilePath, hash);
        } else {
          // Navigate: open new file at current tab position, then close current tab
          const targetTabId = `file-${absoluteFilePath.replace(/\//g, '-')}`;
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
            const fileName = absoluteFilePath.split('/').pop();
            const fileLabel = fileName.replace('.md', '');
            const newTab = {
              id: targetTabId,
              type: 'file',
              label: fileLabel,
              closeable: true,
              filePath: absoluteFilePath
            };

            this.leftTabs.splice(currentIndex, 0, newTab);
            this.switchLeftTab(targetTabId);

            // Fetch file content
            if (!this.fileContents[absoluteFilePath]) {
              this.fetchFileContent(absoluteFilePath).then(() => {
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
