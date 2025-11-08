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
});
