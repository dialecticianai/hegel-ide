const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { ALPINE_INIT, SPLIT_PANE_INIT, HEGEL_CMD } = require('./test-constants');

test.describe('Split-Pane Layout', () => {
  test('split-pane layout renders with correct structure', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for Alpine to initialize
    await mainWindow.waitForTimeout(SPLIT_PANE_INIT);

    // Verify split-container exists
    const splitContainer = await mainWindow.locator('.split-container');
    expect(await splitContainer.isVisible()).toBe(true);

    // Verify left pane exists
    const leftPane = await mainWindow.locator('.left-pane');
    expect(await leftPane.isVisible()).toBe(true);

    // Verify divider exists and has resize cursor
    const divider = await mainWindow.locator('.divider');
    expect(await divider.isVisible()).toBe(true);
    const cursor = await divider.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursor).toBe('col-resize');

    // Verify right pane exists
    const rightPane = await mainWindow.locator('.right-pane');
    expect(await rightPane.isVisible()).toBe(true);

    // Verify terminal container inside right pane
    const terminalContainer = await rightPane.locator('#terminal-container-term-1');
    expect(await terminalContainer.isVisible()).toBe(true);

    // Verify panels have non-zero width
    const leftBox = await leftPane.boundingBox();
    const rightBox = await rightPane.boundingBox();
    expect(leftBox.width).toBeGreaterThan(0);
    expect(rightBox.width).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('project list populates from hegel', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    // Wait for projects to load (hegel command)
    await mainWindow.waitForTimeout(HEGEL_CMD);

    // Switch to Projects tab (auto-open may have opened a project tab)
    const projectsTab = await mainWindow.locator('.left-pane .tab').filter({ hasText: 'Projects' });
    await projectsTab.click();
    await mainWindow.waitForTimeout(ALPINE_INIT);

    const leftPane = await mainWindow.locator('.left-pane');

    // Either projects loaded or error shown (both are valid)
    const projectsList = await leftPane.locator('.projects-list');
    const errorMessage = await leftPane.locator('.error');

    const hasProjects = await projectsList.isVisible();
    const hasError = await errorMessage.isVisible();

    // One of them should be visible
    expect(hasProjects || hasError).toBe(true);

    await electronApp.close();
  });
});
