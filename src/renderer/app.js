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
      const themes = global.HegelIDE.createThemes();

      return {
        ...splitPane,
        ...tabs,
        ...terminals,
        ...projects,
        ...markdown,
        ...themes,

        init() {
          this.initSplitPosition();
          this.initTheme();
          this.loadProjects();
        }
      };
    });
  });

  global.HegelIDE.initializeDefaultTerminal();
})(window);
