import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tabsModule = readFileSync(join(__dirname, '../../lib/tabs.js'), 'utf-8');

describe('lib/tabs.js', () => {
  beforeEach(() => {
    global.window.HegelIDE = {};
    vi.clearAllMocks();

    const require = global.require;
    eval(tabsModule);
  });

  describe('createTabs', () => {
    it('should create tabs module with initial state', () => {
      const tabs = global.window.HegelIDE.createTabs();

      expect(tabs.leftTabs).toHaveLength(1);
      expect(tabs.leftTabs[0].id).toBe('projects');
      expect(tabs.activeLeftTab).toBe('projects');

      expect(tabs.rightTabs).toHaveLength(1);
      expect(tabs.rightTabs[0].id).toBe('term-1');
      expect(tabs.activeRightTab).toBe('term-1');
    });

    it('should switch left tab', () => {
      const tabs = global.window.HegelIDE.createTabs();
      tabs.leftTabs.push({ id: 'test-tab', closeable: true });

      tabs.switchLeftTab('test-tab');

      expect(tabs.activeLeftTab).toBe('test-tab');
    });

    it('should switch right tab', () => {
      const tabs = global.window.HegelIDE.createTabs();
      tabs.terminals = { 'term-1': { fitAddon: { fit: vi.fn() } } };

      tabs.switchRightTab('term-1');

      expect(tabs.activeRightTab).toBe('term-1');
    });

    it('should close left tab if closeable', () => {
      const tabs = global.window.HegelIDE.createTabs();
      tabs.leftTabs.push({ id: 'test-tab', closeable: true });
      tabs.activeLeftTab = 'test-tab';

      tabs.closeLeftTab('test-tab');

      expect(tabs.leftTabs).toHaveLength(1);
      expect(tabs.activeLeftTab).toBe('projects');
    });

    it('should not close non-closeable left tab', () => {
      const tabs = global.window.HegelIDE.createTabs();

      tabs.closeLeftTab('projects');

      expect(tabs.leftTabs).toHaveLength(1);
      expect(tabs.leftTabs[0].id).toBe('projects');
    });

    it('should close right tab and cleanup terminal', async () => {
      const tabs = global.window.HegelIDE.createTabs();
      const mockTerm = { dispose: vi.fn() };
      tabs.terminals = { 'term-2': { term: mockTerm } };
      tabs.rightTabs.push({
        id: 'term-2',
        closeable: true,
        terminalId: 'term-2'
      });

      global.ipcRenderer.invoke.mockResolvedValue({});

      tabs.closeRightTab('term-2');

      expect(mockTerm.dispose).toHaveBeenCalled();
      expect(tabs.terminals['term-2']).toBeUndefined();
      expect(global.ipcRenderer.invoke).toHaveBeenCalledWith('close-terminal', {
        terminalId: 'term-2'
      });
    });

    it('should open project tab', () => {
      const tabs = global.window.HegelIDE.createTabs();
      tabs.projectDetails = {};
      tabs.fetchProjectDetails = vi.fn().mockResolvedValue();
      tabs.fetchProjectReadme = vi.fn().mockResolvedValue();

      tabs.openProjectTab('test-project');

      expect(tabs.leftTabs).toHaveLength(2);
      expect(tabs.leftTabs[1].id).toBe('project-test-project');
      expect(tabs.leftTabs[1].projectName).toBe('test-project');
      expect(tabs.activeLeftTab).toBe('project-test-project');
    });

    it('should switch to existing project tab if already open', () => {
      const tabs = global.window.HegelIDE.createTabs();
      tabs.leftTabs.push({
        id: 'project-test',
        projectName: 'test',
        closeable: true
      });

      const switchSpy = vi.spyOn(tabs, 'switchLeftTab');

      tabs.openProjectTab('test');

      expect(switchSpy).toHaveBeenCalledWith('project-test');
      expect(tabs.leftTabs).toHaveLength(2); // No duplicate
    });
  });
});
