// Main entry point for renderer process

import Alpine from 'alpinejs';
import { createSplitPane } from './split-pane.js';
import { createTabs } from './tabs.js';
import { createTerminals, initializeDefaultTerminal } from './terminals.js';
import { createProjects } from './projects.js';
import { createMarkdown } from './markdown.js';
import { createThemes } from './themes.js';
import { parseMarkdownWithLines, findMarkdownBlock } from './markdown-line-tracking.js';

// Make Alpine globally available for x-data in HTML
window.Alpine = Alpine;

// Expose line-tracking functions globally (for review tabs and testing)
window.HegelIDE = window.HegelIDE || {};
window.HegelIDE.parseMarkdownWithLines = parseMarkdownWithLines;
window.HegelIDE.findMarkdownBlock = findMarkdownBlock;

// Initialize Alpine data component
Alpine.data('splitPane', () => {
  const splitPane = createSplitPane();
  const tabs = createTabs();
  const terminals = createTerminals();
  const projects = createProjects();
  const markdown = createMarkdown();
  const themes = createThemes();

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

// Start Alpine
Alpine.start();

// Initialize default terminal
initializeDefaultTerminal();
