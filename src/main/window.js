// Window management

const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: !process.env.TESTING, // Hide window during tests
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('dist/index.html');

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function setMainWindow(window) {
  mainWindow = window;
}

module.exports = {
  createWindow,
  getMainWindow,
  setMainWindow
};
