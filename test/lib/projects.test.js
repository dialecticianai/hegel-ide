import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectsModule = readFileSync(join(__dirname, '../../lib/projects.js'), 'utf-8');

describe('lib/projects.js', () => {
  beforeEach(() => {
    global.window.HegelIDE = {};
    vi.clearAllMocks();

    const require = global.require;
    eval(projectsModule);
  });

  describe('createProjects', () => {
    it('should create projects module with initial state', () => {
      const projects = global.window.HegelIDE.createProjects();

      expect(projects.projects).toEqual([]);
      expect(projects.projectsLoading).toBe(true);
      expect(projects.projectsError).toBe(null);
      expect(projects.projectDetails).toEqual({});
    });

    it('should load projects successfully', async () => {
      const mockProjects = ['project1', 'project2'];
      global.ipcRenderer.invoke.mockResolvedValue(mockProjects);

      const projects = global.window.HegelIDE.createProjects();
      await projects.loadProjects();

      expect(projects.projects).toEqual(mockProjects);
      expect(projects.projectsLoading).toBe(false);
      expect(projects.projectsError).toBe(null);
      expect(global.ipcRenderer.invoke).toHaveBeenCalledWith('get-projects');
    });

    it('should handle load projects error', async () => {
      global.ipcRenderer.invoke.mockRejectedValue(new Error('Failed'));

      const projects = global.window.HegelIDE.createProjects();
      await projects.loadProjects();

      expect(projects.projects).toEqual([]);
      expect(projects.projectsLoading).toBe(false);
      expect(projects.projectsError).toBe('Failed');
    });

    it('should fetch project details successfully', async () => {
      const mockData = { name: 'test', project_path: '/path/to/project' };
      global.ipcRenderer.invoke.mockResolvedValue(mockData);

      const projects = global.window.HegelIDE.createProjects();
      await projects.fetchProjectDetails('test');

      expect(projects.projectDetails.test.data).toEqual(mockData);
      expect(projects.projectDetails.test.loading).toBe(false);
      expect(projects.projectDetails.test.error).toBe(null);
    });

    it('should fetch project file successfully', async () => {
      const projects = global.window.HegelIDE.createProjects();
      projects.projectDetails.test = {
        data: { project_path: '/path/to/project' }
      };

      global.ipcRenderer.invoke.mockResolvedValue({ content: 'file content' });

      const result = await projects.fetchProjectFile('test', 'README.md');

      expect(result.content).toBe('file content');
      expect(result.error).toBe(null);
      expect(global.ipcRenderer.invoke).toHaveBeenCalledWith('get-project-file', {
        projectPath: '/path/to/project',
        fileName: 'README.md'
      });
    });

    it('should handle missing project path in fetchProjectFile', async () => {
      const projects = global.window.HegelIDE.createProjects();
      projects.projectDetails.test = { data: null };

      const result = await projects.fetchProjectFile('test', 'README.md');

      expect(result).toBe(null);
    });

    it('should fetch and store README', async () => {
      const projects = global.window.HegelIDE.createProjects();
      projects.projectDetails.test = {
        data: { project_path: '/path/to/project' }
      };

      global.ipcRenderer.invoke.mockResolvedValue({ content: '# README' });

      await projects.fetchProjectReadme('test');

      expect(projects.projectDetails.test.readme).toBe('# README');
      expect(projects.projectDetails.test.readmeError).toBe(null);
    });

    it('should refresh project details and README', async () => {
      const projects = global.window.HegelIDE.createProjects();

      const fetchDetailsSpy = vi.spyOn(projects, 'fetchProjectDetails').mockResolvedValue();
      const fetchReadmeSpy = vi.spyOn(projects, 'fetchProjectReadme').mockResolvedValue();

      await projects.refreshProjectDetails('test');

      expect(fetchDetailsSpy).toHaveBeenCalledWith('test');
      expect(fetchReadmeSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('buildTreeFromPaths', () => {
    it('should build tree from single root file', () => {
      const files = [
        { path: 'README.md', lines: 100 }
      ];

      const projects = global.window.HegelIDE.createProjects();
      const tree = projects.buildTreeFromPaths(files);

      expect(tree).toHaveLength(1);
      expect(tree[0]).toEqual({
        type: 'file',
        name: 'README.md',
        path: 'README.md',
        lines: 100
      });
    });

    it('should build tree from multiple root files', () => {
      const files = [
        { path: 'README.md', lines: 100 },
        { path: 'ARCHITECTURE.md', lines: 256 },
        { path: 'VISION.md', lines: 125 }
      ];

      const projects = global.window.HegelIDE.createProjects();
      const tree = projects.buildTreeFromPaths(files);

      expect(tree).toHaveLength(3);
      expect(tree[0].name).toBe('README.md');
      expect(tree[1].name).toBe('ARCHITECTURE.md');
      expect(tree[2].name).toBe('VISION.md');
    });

    it('should build tree with nested directories', () => {
      const files = [
        { path: 'README.md', lines: 100 },
        { path: 'lib/README.md', lines: 46 }
      ];

      const projects = global.window.HegelIDE.createProjects();
      const tree = projects.buildTreeFromPaths(files);

      expect(tree).toHaveLength(2);
      expect(tree[0]).toEqual({
        type: 'file',
        name: 'README.md',
        path: 'README.md',
        lines: 100
      });
      expect(tree[1].type).toBe('directory');
      expect(tree[1].name).toBe('lib');
      expect(tree[1].children).toHaveLength(1);
      expect(tree[1].children[0]).toEqual({
        type: 'file',
        name: 'README.md',
        path: 'lib/README.md',
        lines: 46
      });
    });

    it('should build tree with deeply nested paths', () => {
      const files = [
        { path: 'e2e/fixtures/markdown-links/page-a.md', lines: 9 }
      ];

      const projects = global.window.HegelIDE.createProjects();
      const tree = projects.buildTreeFromPaths(files);

      expect(tree).toHaveLength(1);
      expect(tree[0].type).toBe('directory');
      expect(tree[0].name).toBe('e2e');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].type).toBe('directory');
      expect(tree[0].children[0].name).toBe('fixtures');
      expect(tree[0].children[0].children[0].type).toBe('directory');
      expect(tree[0].children[0].children[0].name).toBe('markdown-links');
      expect(tree[0].children[0].children[0].children[0]).toEqual({
        type: 'file',
        name: 'page-a.md',
        path: 'e2e/fixtures/markdown-links/page-a.md',
        lines: 9
      });
    });

    it('should handle mixed depth levels', () => {
      const files = [
        { path: 'ARCHITECTURE.md', lines: 256 },
        { path: 'lib/README.md', lines: 46 },
        { path: 'e2e/README.md', lines: 77 }
      ];

      const projects = global.window.HegelIDE.createProjects();
      const tree = projects.buildTreeFromPaths(files);

      expect(tree).toHaveLength(3);
      expect(tree[0].type).toBe('file');
      expect(tree[1].type).toBe('directory');
      expect(tree[1].name).toBe('lib');
      expect(tree[2].type).toBe('directory');
      expect(tree[2].name).toBe('e2e');
    });

    it('should return empty array for empty input', () => {
      const projects = global.window.HegelIDE.createProjects();
      const tree = projects.buildTreeFromPaths([]);

      expect(tree).toEqual([]);
    });
  });

  describe('fetchMarkdownTree', () => {
    it('should fetch markdown tree successfully', async () => {
      const mockData = {
        other_markdown: [
          { path: 'README.md', lines: 100 },
          { path: 'lib/README.md', lines: 46 }
        ]
      };
      global.ipcRenderer.invoke.mockResolvedValue(mockData);

      const projects = global.window.HegelIDE.createProjects();
      projects.projectDetails.test = {
        data: { project_path: '/path/to/project' },
        markdownTree: null,
        markdownTreeLoading: false,
        markdownTreeError: null
      };

      await projects.fetchMarkdownTree('test');

      expect(projects.projectDetails.test.markdownTreeLoading).toBe(false);
      expect(projects.projectDetails.test.markdownTreeError).toBe(null);
      expect(projects.projectDetails.test.markdownTree).toHaveLength(2);
      expect(global.ipcRenderer.invoke).toHaveBeenCalledWith('get-markdown-tree', {
        projectPath: '/path/to/project'
      });
    });

    it('should handle fetch markdown tree error', async () => {
      global.ipcRenderer.invoke.mockRejectedValue(new Error('Command failed'));

      const projects = global.window.HegelIDE.createProjects();
      projects.projectDetails.test = {
        data: { project_path: '/path/to/project' },
        markdownTree: null,
        markdownTreeLoading: false,
        markdownTreeError: null
      };

      await projects.fetchMarkdownTree('test');

      expect(projects.projectDetails.test.markdownTreeLoading).toBe(false);
      expect(projects.projectDetails.test.markdownTreeError).toBe('Command failed');
      expect(projects.projectDetails.test.markdownTree).toBe(null);
    });

    it('should handle empty markdown tree', async () => {
      const mockData = { other_markdown: [] };
      global.ipcRenderer.invoke.mockResolvedValue(mockData);

      const projects = global.window.HegelIDE.createProjects();
      projects.projectDetails.test = {
        data: { project_path: '/path/to/project' },
        markdownTree: null,
        markdownTreeLoading: false,
        markdownTreeError: null
      };

      await projects.fetchMarkdownTree('test');

      expect(projects.projectDetails.test.markdownTree).toEqual([]);
      expect(projects.projectDetails.test.markdownTreeError).toBe(null);
    });
  });
});
