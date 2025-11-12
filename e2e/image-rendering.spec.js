const { test, expect } = require('@playwright/test');
const { launchTestElectron, PROJECT_LOAD, TAB_CREATE, ALPINE_INIT, waitForProjectContent, waitForAutoOpenedProject } = require('./test-constants');
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
    const absoluteFilePath = path.join(fixturesPath, 'image-test.md');

    await mainWindow.evaluate(({ markdown, filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));

      // Store file content using absolute path as key
      if (!alpineData.fileContents) {
        alpineData.fileContents = {};
      }
      alpineData.fileContents[filePath] = {
        content: markdown,
        loading: false,
        error: null
      };

      // Create tab with absolute path
      const tabId = `file-${filePath.replace(/\//g, '-')}`;
      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: 'image-test',
        closeable: true,
        filePath: filePath
      });

      alpineData.switchLeftTab(tabId);
    }, { markdown: testMarkdown, filePath: absoluteFilePath });

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
    const absoluteFilePath = path.join(fixturesPath, 'image-test.md');

    await mainWindow.evaluate(({ markdown, filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));

      // Store file content using absolute path as key
      if (!alpineData.fileContents) {
        alpineData.fileContents = {};
      }
      alpineData.fileContents[filePath] = {
        content: markdown,
        loading: false,
        error: null
      };

      // Create tab with absolute path
      const tabId = `file-${filePath.replace(/\//g, '-')}`;
      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: 'image-test',
        closeable: true,
        filePath: filePath
      });

      alpineData.switchLeftTab(tabId);
    }, { markdown: testMarkdown, filePath: absoluteFilePath });

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

  test('renders images in project README with correct file:// URLs', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for hegel-ide to auto-open (happens when terminal CWD matches project path)
    await waitForAutoOpenedProject(mainWindow);

    // Wait for project README to load
    await waitForProjectContent(mainWindow);

    // Check if the hegel.jpg image is rendered
    const image = await mainWindow.locator('.markdown-content img[alt="Hegel"]');
    expect(await image.count()).toBe(1);

    // Verify src is transformed to file:// URL
    const src = await image.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('file://');
    expect(src).toContain('hegel.jpg');

    // Verify image actually loaded by checking naturalWidth
    const imageLoaded = await image.evaluate(img => img.naturalWidth > 0);
    expect(imageLoaded).toBe(true);

    await electronApp.close();
  });
});
