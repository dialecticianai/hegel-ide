import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const splitPaneModule = readFileSync(join(__dirname, '../../lib/split-pane.js'), 'utf-8');

describe('lib/split-pane.js', () => {
  beforeEach(() => {
    global.window.HegelIDE = {};
    global.window.localStorage.getItem.mockReturnValue(null);
    vi.clearAllMocks();

    const require = global.require;
    eval(splitPaneModule);
  });

  describe('createSplitPane', () => {
    it('should create split pane with default state', () => {
      const splitPane = global.window.HegelIDE.createSplitPane();

      expect(splitPane.leftPanelPercent).toBe(60);
      expect(splitPane.isDragging).toBe(false);
    });

    it('should initialize split position from localStorage', () => {
      global.window.localStorage.getItem.mockReturnValue(
        JSON.stringify({ leftPanelPercent: 70 })
      );

      const splitPane = global.window.HegelIDE.createSplitPane();
      splitPane.initSplitPosition();

      expect(splitPane.leftPanelPercent).toBe(70);
    });

    it('should ignore invalid localStorage values', () => {
      global.window.localStorage.getItem.mockReturnValue('invalid json');

      const splitPane = global.window.HegelIDE.createSplitPane();
      splitPane.initSplitPosition();

      expect(splitPane.leftPanelPercent).toBe(60); // Default
    });

    it('should clamp localStorage values between 20 and 80', () => {
      global.window.localStorage.getItem.mockReturnValue(
        JSON.stringify({ leftPanelPercent: 95 })
      );

      const splitPane = global.window.HegelIDE.createSplitPane();
      splitPane.initSplitPosition();

      expect(splitPane.leftPanelPercent).toBe(60); // Should ignore out of range
    });

    it('should have startDrag method', () => {
      const splitPane = global.window.HegelIDE.createSplitPane();

      expect(typeof splitPane.startDrag).toBe('function');
    });
  });
});
