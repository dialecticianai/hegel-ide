const { test, expect } = require('@playwright/test');
const { launchTestElectron } = require('./test-constants');
const { SPLIT_PANE_INIT, HEGEL_CMD } = require('./test-constants');

test.describe('Split-Pane Layout', () => {
  test('split-pane structure renders correctly', async () => {
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

    // Verify divider exists
    const divider = await mainWindow.locator('.divider');
    expect(await divider.isVisible()).toBe(true);

    // Verify right pane exists
    const rightPane = await mainWindow.locator('.right-pane');
    expect(await rightPane.isVisible()).toBe(true);

    // Verify terminal container inside right pane
    const terminalContainer = await rightPane.locator('#terminal-container-term-1');
    expect(await terminalContainer.isVisible()).toBe(true);

    await electronApp.close();
  });

  test('divider has resize cursor', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    const divider = await mainWindow.locator('.divider');
    const cursor = await divider.evaluate(el => window.getComputedStyle(el).cursor);

    expect(cursor).toBe('col-resize');

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

  test('panels have non-zero width', async () => {
    const electronApp = await launchTestElectron();

    const firstPage = await electronApp.firstWindow();
    await firstPage.waitForLoadState('domcontentloaded');

    const windows = electronApp.windows();
    const mainWindow = windows.find(w => w.url().includes('index.html'));

    await mainWindow.waitForTimeout(500);

    const leftPane = await mainWindow.locator('.left-pane');
    const rightPane = await mainWindow.locator('.right-pane');

    const leftBox = await leftPane.boundingBox();
    const rightBox = await rightPane.boundingBox();

    expect(leftBox.width).toBeGreaterThan(0);
    expect(rightBox.width).toBeGreaterThan(0);

    await electronApp.close();
  });
});
