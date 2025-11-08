// Markdown rendering and UI utilities

(function(global) {
  'use strict';

  const { ipcRenderer } = require('electron');
  const { marked } = require('marked');

  function createMarkdown() {
    return {
      renderMarkdown(content) {
        if (!content) return '';
        return marked.parse(content);
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
