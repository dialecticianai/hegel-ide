// Project discovery, details fetching, and file operations

const { ipcRenderer } = require('electron');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

export function createProjects() {
    return {
      projects: [],
      projectsLoading: true,
      projectsError: null,
      projectDetails: {},
      fileContents: {},
      collapsedProjects: {}, // Track collapsed state per project name

      async loadProjects() {
        try {
          this.projectsLoading = true;
          this.projectsError = null;

          const projects = await ipcRenderer.invoke('get-projects');
          this.projects = projects;

          // Initialize all projects as collapsed
          projects.forEach(project => {
            this.collapsedProjects[project.name] = true;
          });

          this.projectsLoading = false;

          // Auto-open project if terminal cwd matches
          await this.autoOpenProjectFromCwd();
        } catch (error) {
          this.projectsError = error.message || 'Failed to load projects';
          this.projectsLoading = false;
        }
      },

      toggleProjectCollapse(projectName) {
        this.collapsedProjects[projectName] = !this.collapsedProjects[projectName];
      },

      isProjectCollapsed(projectName) {
        return this.collapsedProjects[projectName] !== false; // Default to collapsed
      },

      async autoOpenProjectFromCwd() {
        try {
          // Get terminal cwd
          const { cwd } = await ipcRenderer.invoke('get-terminal-cwd');
          if (!cwd) return;

          // Check each project to see if cwd matches
          for (const project of this.projects) {
            if (project.project_path) {
              // Check if cwd matches or is inside project path
              if (cwd === project.project_path || cwd.startsWith(project.project_path + '/')) {
                // Found matching project - open it
                this.openProjectTab(project.name);
                return;
              }
            }
          }
        } catch (error) {
          // Silently fail - auto-open is nice-to-have, not critical
          console.error('Failed to auto-open project from cwd:', error);
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
            markdownTreeError: null,
            currentFile: null
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
            markdownTreeError: this.projectDetails[projectName]?.markdownTreeError || null,
            currentFile: this.projectDetails[projectName]?.currentFile || null
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
            markdownTreeError: null,
            currentFile: null
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
        const currentFile = this.projectDetails[projectName]?.currentFile || 'README.md';
        await this.loadFileInline(projectName, currentFile);
      },

      async removeProject(projectName) {
        // Show confirmation dialog
        const confirmed = confirm(
          `Remove project "${projectName}" from tracking?\n\nThis will clear cached data but will not delete any files.`
        );

        if (!confirmed) {
          return;
        }

        try {
          await ipcRenderer.invoke('remove-project', { projectName });

          // Reload projects list
          await this.loadProjects();

          // Close any open tabs for this project
          const projectTab = this.leftTabs.find(
            tab => tab.type === 'project-detail' && tab.projectName === projectName
          );
          if (projectTab) {
            this.closeLeftTab(projectTab.id);
          }
        } catch (error) {
          alert(`Failed to remove project: ${error.message}`);
        }
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

      handleTreeClick(event, projectName) {
        console.log('[handleTreeClick] event.target:', event.target);
        console.log('[handleTreeClick] classList:', event.target.classList);

        const target = event.target;
        if (!target.classList.contains('markdown-tree-file')) {
          console.log('[handleTreeClick] target does not have markdown-tree-file class, ignoring');
          return;
        }

        const relativeFilePath = target.getAttribute('data-path');
        console.log('[handleTreeClick] relativeFilePath:', relativeFilePath);
        if (!relativeFilePath) return;

        // Get project path to construct absolute path
        const projectData = this.projectDetails[projectName]?.data;
        if (!projectData || !projectData.project_path) return;

        const absoluteFilePath = `${projectData.project_path}/${relativeFilePath}`;

        const isModifierClick = event.metaKey || event.ctrlKey;
        console.log('[handleTreeClick] isModifierClick:', isModifierClick);

        if (isModifierClick) {
          // Cmd+Click: open new file tab with absolute path
          console.log('[handleTreeClick] opening file tab for:', absoluteFilePath);
          this.openFileTab(absoluteFilePath);
        } else {
          // Regular click: replace README inline
          console.log('[handleTreeClick] loading file inline for:', relativeFilePath);
          this.loadFileInline(projectName, relativeFilePath);
        }
      },

      async loadFileInline(projectName, filePath) {
        const result = await this.fetchProjectFile(projectName, filePath);
        if (result && result.content) {
          this.projectDetails[projectName].readme = result.content;
          this.projectDetails[projectName].currentFile = filePath;
        } else if (result && result.error) {
          this.projectDetails[projectName].readmeError = result.error;
        }
      },

      renderMarkdownTree(tree, currentFile = null) {
        if (!tree || tree.length === 0) {
          return '<div class="markdown-tree-empty">No other documents found</div>';
        }

        const lines = ['Other Documents:'];
        this._renderTreeNode(tree, '', true, lines, currentFile);
        return lines.join('\n');
      },

      _renderTreeNode(nodes, prefix, isLast, lines, currentFile) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const isLastNode = i === nodes.length - 1;
          const connector = isLastNode ? '└──' : '├──';
          const childPrefix = isLastNode ? '    ' : '│   ';

          if (node.type === 'file') {
            const isActive = currentFile && node.path === currentFile;
            const activeClass = isActive ? ' active' : '';
            lines.push(`${prefix}${connector} <span class="markdown-tree-file${activeClass}" data-path="${node.path}">${node.name}</span> (${node.lines} lines)`);
          } else {
            lines.push(`${prefix}${connector} <span class="markdown-tree-dir">${node.name}/</span>`);
            if (node.children && node.children.length > 0) {
              this._renderTreeNode(node.children, prefix + childPrefix, false, lines, currentFile);
            }
          }
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

      compressFilePath(filePath) {
        if (!filePath) return '';

        // Remove .md extension for display
        const withoutExt = filePath.replace(/\.md$/, '');

        // Split into parts
        const parts = withoutExt.split('/');

        // If 3 or fewer parts, no compression needed
        if (parts.length <= 3) {
          return withoutExt;
        }

        // Compress: first..second-to-last/last
        const first = parts[0];
        const secondToLast = parts[parts.length - 2];
        const last = parts[parts.length - 1];
        const compressed = `${first}..${secondToLast}/${last}`;

        // Only use compression if it saves at least 3 characters
        if (withoutExt.length - compressed.length >= 3) {
          return compressed;
        }

        return withoutExt;
      },

      formatWorkflowState(state) {
        if (!state) return 'none';
        // state is an object, format it similar to hegel status
        return JSON.stringify(state);
      }
    };
}
