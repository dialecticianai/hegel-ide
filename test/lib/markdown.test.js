import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the module
const markdownModule = readFileSync(join(__dirname, '../../lib/markdown.js'), 'utf-8');

describe('lib/markdown.js', () => {
  beforeEach(() => {
    // Reset global state
    global.window.HegelIDE = {};
    vi.clearAllMocks();

    // Execute module with require in scope
    const require = global.require;
    eval(markdownModule);
  });

  describe('createMarkdown', () => {
    it('should create markdown module with renderMarkdown function', () => {
      const markdown = global.window.HegelIDE.createMarkdown();

      expect(markdown).toHaveProperty('renderMarkdown');
      expect(typeof markdown.renderMarkdown).toBe('function');
    });

    it('should render markdown content', () => {
      const markdown = global.window.HegelIDE.createMarkdown();

      const result = markdown.renderMarkdown('test content');

      expect(result).toContain('<p>test content</p>');
    });

    it('should return empty string for null content', () => {
      const markdown = global.window.HegelIDE.createMarkdown();

      const result = markdown.renderMarkdown(null);

      expect(result).toBe('');
    });

    it('should return empty string for undefined content', () => {
      const markdown = global.window.HegelIDE.createMarkdown();

      const result = markdown.renderMarkdown(undefined);

      expect(result).toBe('');
    });

    it('should have toggleDevTools function', () => {
      const markdown = global.window.HegelIDE.createMarkdown();

      expect(markdown).toHaveProperty('toggleDevTools');
      expect(typeof markdown.toggleDevTools).toBe('function');
    });

    it('should invoke toggle-devtools via IPC', async () => {
      const markdown = global.window.HegelIDE.createMarkdown();
      global.ipcRenderer.invoke.mockResolvedValue({});

      await markdown.toggleDevTools();

      expect(global.ipcRenderer.invoke).toHaveBeenCalledWith('toggle-devtools');
    });
  });
});
