// Main Alpine.js component - composes all modules

(function(global) {
  'use strict';

  document.addEventListener('alpine:init', () => {
    Alpine.data('splitPane', () => {
      const splitPane = global.HegelIDE.createSplitPane();
      const tabs = global.HegelIDE.createTabs();
      const terminals = global.HegelIDE.createTerminals();
      const projects = global.HegelIDE.createProjects();
      const markdown = global.HegelIDE.createMarkdown();

      return {
        ...splitPane,
        ...tabs,
        ...terminals,
        ...projects,
        ...markdown,

        init() {
          this.initSplitPosition();
          this.loadProjects();
        }
      };
    });
  });

  global.HegelIDE.initializeDefaultTerminal();
})(window);
