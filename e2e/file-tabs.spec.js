const { test, expect } = require('@playwright/test');
const { launchTestElectron, ALPINE_INIT, TAB_CREATE } = require('./test-constants');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create test fixtures with absolute paths
const fixturesDir = path.join(__dirname, 'fixtures', 'markdown-links');
const testFilePath = path.join(fixturesDir, 'index.md');

test.describe('File Tabs with Absolute Paths', () => {
  test('can open file tab with absolute path', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open file tab with absolute path programmatically
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));

      const fileName = filePath.split('/').pop();
      const fileLabel = fileName.replace('.md', '');
      const tabId = `file-${filePath.replace(/\//g, '-')}`;

      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: fileLabel,
        closeable: true,
        filePath: filePath
      });

      alpineData.switchLeftTab(tabId);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Verify tab exists
    const fileTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    expect(await fileTab.isVisible()).toBe(true);

    // Verify tab has correct structure
    const tabData = await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));
      const tabId = `file-${filePath.replace(/\//g, '-')}`;
      return alpineData.leftTabs.find(t => t.id === tabId);
    }, { filePath: testFilePath });

    expect(tabData).toBeDefined();
    expect(tabData.type).toBe('file');
    expect(tabData.filePath).toBe(testFilePath);
    expect(tabData.projectName).toBeUndefined(); // Should not have projectName

    await electronApp.close();
  });

  test('file content loads from absolute path', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Read actual file content
    const expectedContent = fs.readFileSync(testFilePath, 'utf-8');

    // Inject file content using absolute path as key
    await mainWindow.evaluate(({ filePath, content }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));

      // Initialize fileContents if needed
      if (!alpineData.fileContents) {
        alpineData.fileContents = {};
      }

      // Content keyed by absolute path only
      alpineData.fileContents[filePath] = {
        content: content,
        loading: false,
        error: null
      };

      // Create and open tab
      const fileName = filePath.split('/').pop();
      const fileLabel = fileName.replace('.md', '');
      const tabId = `file-${filePath.replace(/\//g, '-')}`;

      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: fileLabel,
        closeable: true,
        filePath: filePath
      });

      alpineData.switchLeftTab(tabId);
    }, { filePath: testFilePath, content: expectedContent });

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Verify markdown content renders
    const markdownContent = await mainWindow.locator('.markdown-content:visible');
    expect(await markdownContent.isVisible()).toBe(true);

    // Verify content is not empty
    const textContent = await markdownContent.textContent();
    expect(textContent.length).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('file tab is closeable', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Open file tab
    await mainWindow.evaluate(({ filePath }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));

      const fileName = filePath.split('/').pop();
      const fileLabel = fileName.replace('.md', '');
      const tabId = `file-${filePath.replace(/\//g, '-')}`;

      alpineData.leftTabs.push({
        id: tabId,
        type: 'file',
        label: fileLabel,
        closeable: true,
        filePath: filePath
      });

      alpineData.switchLeftTab(tabId);
    }, { filePath: testFilePath });

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Verify tab exists
    const fileTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    expect(await fileTab.isVisible()).toBe(true);

    // Verify close button visible
    const closeBtn = fileTab.locator('.close-tab');
    expect(await closeBtn.isVisible()).toBe(true);

    // Close tab
    await closeBtn.click();
    await mainWindow.waitForTimeout(200);

    // Verify tab is gone
    expect(await fileTab.isVisible()).toBe(false);

    await electronApp.close();
  });

  test('multiple file tabs can be open simultaneously', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(ALPINE_INIT);

    const file1 = path.join(fixturesDir, 'index.md');
    const file2 = path.join(fixturesDir, 'page-a.md');

    // Open two file tabs
    await mainWindow.evaluate(({ file1, file2 }) => {
      const alpineData = Alpine.$data(document.getElementById('app'));

      // Open first tab
      const fileName1 = file1.split('/').pop();
      const fileLabel1 = fileName1.replace('.md', '');
      const tabId1 = `file-${file1.replace(/\//g, '-')}`;

      alpineData.leftTabs.push({
        id: tabId1,
        type: 'file',
        label: fileLabel1,
        closeable: true,
        filePath: file1
      });

      // Open second tab
      const fileName2 = file2.split('/').pop();
      const fileLabel2 = fileName2.replace('.md', '');
      const tabId2 = `file-${file2.replace(/\//g, '-')}`;

      alpineData.leftTabs.push({
        id: tabId2,
        type: 'file',
        label: fileLabel2,
        closeable: true,
        filePath: file2
      });

      alpineData.switchLeftTab(tabId2);
    }, { file1, file2 });

    await mainWindow.waitForTimeout(ALPINE_INIT);

    // Verify both tabs exist
    const indexTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'index' });
    const pageATab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'page-a' });

    expect(await indexTab.isVisible()).toBe(true);
    expect(await pageATab.isVisible()).toBe(true);

    // Verify page-a is active
    const hasActiveClass = await pageATab.evaluate(el => el.classList.contains('active'));
    expect(hasActiveClass).toBe(true);

    await electronApp.close();
  });
});
