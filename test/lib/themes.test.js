import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const themesModule = readFileSync(join(__dirname, '../../lib/themes.js'), 'utf-8');

describe('lib/themes.js', () => {
  beforeEach(() => {
    global.window.HegelIDE = {};
    global.window.localStorage.getItem.mockReturnValue(null);
    global.window.matchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    global.document.body.classList.add.mockClear();
    global.document.body.classList.remove.mockClear();
    vi.clearAllMocks();

    const require = global.require;
    eval(themesModule);
  });

  describe('createThemes', () => {
    it('should create themes with default state', () => {
      const themes = global.window.HegelIDE.createThemes();

      expect(themes.currentTheme).toBe('auto');
      expect(typeof themes.initTheme).toBe('function');
      expect(typeof themes.setTheme).toBe('function');
    });

    it('should initialize with auto theme by default', () => {
      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(themes.currentTheme).toBe('auto');
    });

    it('should initialize theme from localStorage', () => {
      global.window.localStorage.getItem.mockReturnValue(
        JSON.stringify({ selected: 'dark' })
      );

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(themes.currentTheme).toBe('dark');
    });

    it('should default to auto on invalid localStorage data', () => {
      global.window.localStorage.getItem.mockReturnValue('invalid json');

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(themes.currentTheme).toBe('auto');
    });

    it('should save theme to localStorage when switching', () => {
      const themes = global.window.HegelIDE.createThemes();
      themes.setTheme('synthwave');

      expect(global.window.localStorage.setItem).toHaveBeenCalledWith(
        'hegel-ide:theme',
        JSON.stringify({ selected: 'synthwave' })
      );
    });

    it('should update currentTheme state when switching', () => {
      const themes = global.window.HegelIDE.createThemes();
      themes.setTheme('light');

      expect(themes.currentTheme).toBe('light');
    });

    it('should detect dark system preference for auto mode', () => {
      global.window.matchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(global.window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should detect light system preference for auto mode', () => {
      global.window.matchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(global.window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should set up system preference listener for auto mode', () => {
      const mockAddEventListener = vi.fn();
      global.window.matchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn()
      });

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not set up listener for non-auto themes', () => {
      const mockAddEventListener = vi.fn();
      global.window.matchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn()
      });

      global.window.localStorage.getItem.mockReturnValue(
        JSON.stringify({ selected: 'dark' })
      );

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(mockAddEventListener).not.toHaveBeenCalled();
    });

    it('should apply theme class to body element', () => {
      const themes = global.window.HegelIDE.createThemes();
      themes.setTheme('dark');

      expect(global.document.body.classList.add).toHaveBeenCalledWith('theme-dark');
    });

    it('should remove previous theme class when switching', () => {
      const themes = global.window.HegelIDE.createThemes();
      themes.setTheme('dark');

      global.document.body.classList.add.mockClear();
      global.document.body.classList.remove.mockClear();

      themes.setTheme('light');

      expect(global.document.body.classList.remove).toHaveBeenCalled();
      expect(global.document.body.classList.add).toHaveBeenCalledWith('theme-light');
    });

    it('should apply dark theme class for auto mode with dark preference', () => {
      global.window.matchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(global.document.body.classList.add).toHaveBeenCalledWith('theme-dark');
    });

    it('should apply light theme class for auto mode with light preference', () => {
      global.window.matchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });

      const themes = global.window.HegelIDE.createThemes();
      themes.initTheme();

      expect(global.document.body.classList.add).toHaveBeenCalledWith('theme-light');
    });
  });
});
