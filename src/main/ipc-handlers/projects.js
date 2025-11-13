// Project-related IPC handlers

const { ipcMain } = require('electron');
const { runHegelCommand } = require('../hegel.js');

function registerProjectHandlers() {
  // Handle project discovery request
  ipcMain.handle('get-projects', async () => {
    const output = await runHegelCommand(['pm', 'discover', 'list', '--json'], { parseJson: true });
    return output.projects;
  });

  // Handle project detail request
  ipcMain.handle('get-project-details', async (event, { projectName }) => {
    return await runHegelCommand(['pm', 'discover', 'show', projectName, '--json'], { parseJson: true });
  });

  // Handle project removal
  ipcMain.handle('remove-project', async (event, { projectName }) => {
    return await runHegelCommand(['pm', 'remove', projectName], { errorPrefix: 'Failed to remove project' });
  });

  // Handle single project refresh
  ipcMain.handle('refresh-project', async (event, { projectName }) => {
    return await runHegelCommand(['pm', 'refresh', projectName], { errorPrefix: 'Failed to refresh project' });
  });

  // Handle refresh all projects
  ipcMain.handle('refresh-all-projects', async () => {
    return await runHegelCommand(['pm', 'refresh'], { errorPrefix: 'Failed to refresh all projects' });
  });

  // Handle markdown tree request
  ipcMain.handle('get-markdown-tree', async (event, { projectPath }) => {
    return await runHegelCommand(['md', '--no-ddd', '--json', '--state-dir', projectPath], { parseJson: true });
  });
}

module.exports = { registerProjectHandlers };
