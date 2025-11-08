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
            readmeError: null
          };

          const data = await ipcRenderer.invoke('get-project-details', { projectName });
          this.projectDetails[projectName] = {
            data: data,
            loading: false,
            error: null,
            readme: this.projectDetails[projectName]?.readme || null,
            readmeError: this.projectDetails[projectName]?.readmeError || null
          };
        } catch (error) {
          this.projectDetails[projectName] = {
            data: null,
            loading: false,
            error: error.message || 'Failed to load project details',
            readme: null,
            readmeError: null
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
