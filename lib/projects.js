// Project discovery, details fetching, and file operations

(function(global) {
  'use strict';

  const { ipcRenderer } = require('electron');
  const dayjs = require('dayjs');
  const relativeTime = require('dayjs/plugin/relativeTime');
  dayjs.extend(relativeTime);

  function createProjects() {
    return {
      projects: [],
      projectsLoading: true,
      projectsError: null,
      projectDetails: {},

      async loadProjects() {
        try {
          this.projectsLoading = true;
          this.projectsError = null;

          const projects = await ipcRenderer.invoke('get-projects');
          this.projects = projects;
          this.projectsLoading = false;
        } catch (error) {
          this.projectsError = error.message || 'Failed to load projects';
          this.projectsLoading = false;
        }
      },

      async fetchProjectDetails(projectName) {
        try {
          this.projectDetails[projectName] = {
            data: null,
            loading: true,
            error: null,
            readme: null,
            readmeError: null,
            markdownTree: null,
            markdownTreeLoading: false,
            markdownTreeError: null
          };

          const data = await ipcRenderer.invoke('get-project-details', { projectName });
          this.projectDetails[projectName] = {
            data: data,
            loading: false,
            error: null,
            readme: this.projectDetails[projectName]?.readme || null,
            readmeError: this.projectDetails[projectName]?.readmeError || null,
            markdownTree: this.projectDetails[projectName]?.markdownTree || null,
            markdownTreeLoading: this.projectDetails[projectName]?.markdownTreeLoading || false,
            markdownTreeError: this.projectDetails[projectName]?.markdownTreeError || null
          };
        } catch (error) {
          this.projectDetails[projectName] = {
            data: null,
            loading: false,
            error: error.message || 'Failed to load project details',
            readme: null,
            readmeError: null,
            markdownTree: null,
            markdownTreeLoading: false,
            markdownTreeError: null
          };
        }
      },

      async fetchProjectFile(projectName, fileName) {
        try {
          const projectData = this.projectDetails[projectName]?.data;
          if (!projectData || !projectData.project_path) {
            return null;
          }

          const result = await ipcRenderer.invoke('get-project-file', {
            projectPath: projectData.project_path,
            fileName: fileName
          });

          if (result.content) {
            return { content: result.content, error: null };
          } else {
            return { content: null, error: result.error };
          }
        } catch (error) {
          return { content: null, error: error.message };
        }
      },

      async fetchProjectReadme(projectName) {
        const result = await this.fetchProjectFile(projectName, 'README.md');
        if (result) {
          this.projectDetails[projectName].readme = result.content;
          this.projectDetails[projectName].readmeError = result.error;
        }
      },

      async refreshProjectDetails(projectName) {
        await this.fetchProjectDetails(projectName);
        await this.fetchProjectReadme(projectName);
      },

      buildTreeFromPaths(files) {
        if (!files || files.length === 0) return [];

        const root = [];

        for (const file of files) {
          const parts = file.path.split('/');
          let currentLevel = root;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = i === parts.length - 1;

            if (isLastPart) {
              // This is a file
              currentLevel.push({
                type: 'file',
                name: part,
                path: file.path,
                lines: file.lines
              });
            } else {
              // This is a directory
              let dir = currentLevel.find(node => node.type === 'directory' && node.name === part);
              if (!dir) {
                dir = {
                  type: 'directory',
                  name: part,
                  children: []
                };
                currentLevel.push(dir);
              }
              currentLevel = dir.children;
            }
          }
        }

        return root;
      },

      async fetchMarkdownTree(projectName) {
        try {
          const projectData = this.projectDetails[projectName]?.data;
          if (!projectData || !projectData.project_path) {
            return;
          }

          this.projectDetails[projectName].markdownTreeLoading = true;
          this.projectDetails[projectName].markdownTreeError = null;

          const data = await ipcRenderer.invoke('get-markdown-tree', {
            projectPath: projectData.project_path
          });

          const tree = this.buildTreeFromPaths(data.other_markdown || []);
          this.projectDetails[projectName].markdownTree = tree;
          this.projectDetails[projectName].markdownTreeLoading = false;
        } catch (error) {
          this.projectDetails[projectName].markdownTreeLoading = false;
          this.projectDetails[projectName].markdownTreeError = error.message || 'Failed to load markdown tree';
        }
      },

      // Formatting utilities
      formatNumber(num) {
        if (num >= 1000000000) return Math.floor(num / 1000000000) + 'B';
        if (num >= 1000000) return Math.floor(num / 1000000) + 'M';
        if (num >= 1000) return Math.floor(num / 1000) + 'k';
        return num.toString();
      },

      formatBytes(bytes) {
        if (bytes >= 1000000000) return Math.floor(bytes / 1000000000) + 'GB';
        if (bytes >= 1000000) return Math.floor(bytes / 1000000) + 'MB';
        if (bytes >= 1000) return Math.floor(bytes / 1000) + 'KB';
        return bytes + 'B';
      },

      formatTimeAgo(timestamp) {
        if (!timestamp) return 'never';
        return dayjs(timestamp).fromNow();
      },

      formatPath(path) {
        if (!path) return '';
        const homeDir = require('os').homedir();
        return path.replace(homeDir, '$HOME');
      },

      formatWorkflowState(state) {
        if (!state) return 'none';
        // state is an object, format it similar to hegel status
        return JSON.stringify(state);
      }
    };
  }

  global.HegelIDE = global.HegelIDE || {};
  global.HegelIDE.createProjects = createProjects;
})(window);
