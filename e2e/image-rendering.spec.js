const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { PROJECT_LOAD, TAB_CREATE, ALPINE_INIT } = require('./test-constants');
const path = require('path');

test.describe('Image Rendering', () => {
  test('renders inline HTML images with correct src paths', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Inject test markdown with image
    const testMarkdown = `# Image Test\n\n<img src="test-pixel.png" alt="Test" width="10">`;
    const fixturesPath = path.join(__dirname, 'fixtures', 'images');

    await mainWindow.evaluate(({ markdown, projectPath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const projectName = 'test-project';
      const fileName = 'image-test.md';
      const fileKey = `${projectName}:${fileName}`;

      // Set up project details with path
      if (!alpineData.projectDetails) {
        alpineData.projectDetails = {};
      }
      alpineData.projectDetails[projectName] = {
        data: {
          project_path: projectPath
        }
      };

      // Store file content
      if (!alpineData.fileContents) {
        alpineData.fileContents = {};
      }
      alpineData.fileContents[fileKey] = {
        content: markdown,
        loading: false,
        error: null
      };

      // Create tab
      const tabId = `file-${projectName}-${fileName}`;
      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: 'image-test',
        closeable: true,
        projectName: projectName,
        filePath: fileName
      });

      alpineData.switchLeftTab(tabId);
    }, { markdown: testMarkdown, projectPath: fixturesPath });

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Check if image is rendered
    const image = await mainWindow.locator('.markdown-content img[alt="Test"]');
    expect(await image.count()).toBe(1);

    // Check if src attribute exists and is not broken
    const src = await image.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).not.toBe('test-pixel.png'); // Should be transformed to absolute path

    await electronApp.close();
  });

  test('renders markdown images with correct src paths', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(PROJECT_LOAD);

    // Inject test markdown with markdown-style image
    const testMarkdown = `# Image Test\n\n![Test Pixel](test-pixel.png)`;
    const fixturesPath = path.join(__dirname, 'fixtures', 'images');

    await mainWindow.evaluate(({ markdown, projectPath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const projectName = 'test-project';
      const fileName = 'image-test.md';
      const fileKey = `${projectName}:${fileName}`;

      // Set up project details with path
      if (!alpineData.projectDetails) {
        alpineData.projectDetails = {};
      }
      alpineData.projectDetails[projectName] = {
        data: {
          project_path: projectPath
        }
      };

      if (!alpineData.fileContents) {
        alpineData.fileContents = {};
      }
      alpineData.fileContents[fileKey] = {
        content: markdown,
        loading: false,
        error: null
      };

      const tabId = `file-${projectName}-${fileName}`;
      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: 'image-test',
        closeable: true,
        projectName: projectName,
        filePath: fileName
      });

      alpineData.switchLeftTab(tabId);
    }, { markdown: testMarkdown, projectPath: fixturesPath });

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Check if image is rendered
    const image = await mainWindow.locator('.markdown-content img[alt="Test Pixel"]');
    expect(await image.count()).toBe(1);

    // Check if src attribute is transformed
    const src = await image.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).not.toBe('test-pixel.png'); // Should be transformed to absolute path

    await electronApp.close();
  });
});
