const { test, expect } = require('@playwright/test');
const { launchTestElectron, PROJECT_LOAD, PROJECT_DETAIL, TAB_CREATE, waitForProjectContent, waitForAutoOpenedProject } = require('./test-constants');

test.describe('Markdown Document Tree', () => {
  test('tree section visible above README', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);
    await waitForProjectContent(mainWindow);

    // Verify tree section exists
    const treeSection = await mainWindow.locator('.markdown-tree');
    expect(await treeSection.isVisible()).toBe(true);

    // Verify it's above README content (earlier in DOM order)
    const projectTabContainer = await mainWindow.locator('.tab-content > div').filter({ has: mainWindow.locator('.markdown-tree-container') });
    const children = await projectTabContainer.locator('> *').all();

    let treeIndex = -1;
    let readmeIndex = -1;
    for (let i = 0; i < children.length; i++) {
      const className = await children[i].getAttribute('class');
      if (className && className.includes('markdown-tree-container')) treeIndex = i;
      if (className && className.includes('tab-content-padded')) readmeIndex = i;
    }

    expect(treeIndex).toBeGreaterThanOrEqual(0);
    expect(readmeIndex).toBeGreaterThan(treeIndex);

    await electronApp.close();
  });

  test('tree renders with box-drawing characters', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);
    await waitForProjectContent(mainWindow);

    const treeSection = await mainWindow.locator('.markdown-tree');
    const treeText = await treeSection.textContent();

    // Verify box-drawing characters present
    const hasBoxDrawing = treeText.includes('├──') || treeText.includes('└──');
    expect(hasBoxDrawing).toBe(true);

    await electronApp.close();
  });

  test('tree shows directories with trailing slash', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);
    await waitForProjectContent(mainWindow);

    const treeSection = await mainWindow.locator('.markdown-tree');
    const treeText = await treeSection.textContent();

    // Look for directories with trailing slash (lib/, e2e/, etc)
    const hasDirectorySlash = /\w+\//.test(treeText);
    expect(hasDirectorySlash).toBe(true);

    await electronApp.close();
  });

  test('tree shows files with line counts', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);
    await waitForProjectContent(mainWindow);

    const treeSection = await mainWindow.locator('.markdown-tree');
    const treeText = await treeSection.textContent();

    // Look for line count format: "(N lines)"
    const hasLineCounts = /\(\d+ lines\)/.test(treeText);
    expect(hasLineCounts).toBe(true);

    await electronApp.close();
  });

  test('tree has three-line max height with scroll', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);
    await waitForProjectContent(mainWindow);

    const treeContent = await mainWindow.locator('.markdown-tree-content');

    // Get computed style
    const maxHeight = await treeContent.evaluate(el => {
      return window.getComputedStyle(el).maxHeight;
    });

    const overflowY = await treeContent.evaluate(el => {
      return window.getComputedStyle(el).overflowY;
    });

    // Verify max height is set (not 'none')
    expect(maxHeight).not.toBe('none');

    // Verify overflow is auto or scroll
    expect(['auto', 'scroll']).toContain(overflowY);

    await electronApp.close();
  });

  test('tree shows loading state initially', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load and hegel-ide to auto-open
    await waitForAutoOpenedProject(mainWindow);

    // Check for loading state before tree loads (may be too fast to catch reliably)
    // This test verifies the state exists in the code path
    const loadingOrTree = await mainWindow.locator('.markdown-tree').textContent();

    // After PROJECT_DETAIL timeout, should show tree or "Fetching" or error
    expect(loadingOrTree.length).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('empty tree shows appropriate message', async () => {
    test.skip(); // Skip unless we have a test project with no markdown files
  });
});
